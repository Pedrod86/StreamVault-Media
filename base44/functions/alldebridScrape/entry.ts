import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Scrapes public torrent indexes for a title, then checks which results are
// instantly cached on the user's AllDebrid account. Returns the ranked list
// plus the best cached candidate's magnet — the frontend unlocks/plays it via
// the separate `alldebridUnlock` function on demand.

function formatSize(bytes = 0) {
  if (!bytes) return null;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function qualityBadge(name = '') {
  const n = (name || '').toLowerCase();
  if (/2160|4k|uhd/.test(n)) return '4K';
  if (/1080|fhd|bluray|remux|br-?rip/.test(n)) return '1080p';
  if (/720|hdrip|web-?dl|webdl/.test(n)) return '720p';
  if (/480|sd|xvid|dvdrip/.test(n)) return 'SD';
  return '—';
}

function magnetFromHash(hash, name) {
  const dn = encodeURIComponent(name || '');
  const tr = [
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://open.stealth.si:80/announce',
    'udp://exodus.desync.com:6969/announce',
    'udp://tracker.torrent.eu.org:451/announce',
  ].map(t => `&tr=${encodeURIComponent(t)}`).join('');
  return `magnet:?xt=urn:btih:${hash}&dn=${dn}${tr}`;
}

async function fetchWith(url, opts = {}, timeoutMs = 15000) {
  return fetch(url, {
    ...opts,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'Accept': 'text/html,application/json,*/*',
      ...(opts.headers || {}),
    },
  });
}

async function scrapeApibay(query, year) {
  const q = year ? `${query} ${year}` : query;
  const url = `https://apibay.org/q.php?q=${encodeURIComponent(q)}&cat=200,201,202,205,207,208`;
  const res = await fetchWith(url);
  if (!res.ok) throw new Error(`apibay HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('apibay bad response');
  return data
    .filter(r => r && r.info_hash && r.info_hash.length >= 40 && String(r.seeders) !== '0' && r.name !== 'No results returned')
    .map(r => ({
      title: r.name,
      hash: r.info_hash.toLowerCase(),
      magnet: magnetFromHash(r.info_hash, r.name),
      sizeBytes: parseInt(r.size, 10) || 0,
      seeders: parseInt(r.seeders, 10) || 0,
      leechers: parseInt(r.leechers, 10) || 0,
      source: 'piratebay',
    }));
}

async function scrape1337x(query, year) {
  const q = (year ? `${query} ${year}` : query).trim();
  const res = await fetchWith(`https://1337x.to/search/${encodeURIComponent(q)}/1/`);
  if (!res.ok) throw new Error(`1337x HTTP ${res.status}`);
  const html = await res.text();
  const rows = [...html.matchAll(/<a href="\/torrent\/(\d+)\/[^"]+"[^>]*>([\s\S]*?)<\/a>/g)];
  const out = [];
  for (const m of rows.slice(0, 25)) {
    out.push({ id: m[1], title: (m[2] || '').replace(/<[^>]+>/g, '').trim() });
  }
  const items = [];
  for (const r of out) {
    try {
      const detail = await fetchWith(`https://1337x.to/torrent/${r.id}/`);
      if (!detail.ok) continue;
      const page = await detail.text();
      const mm = page.match(/href="(magnet:\?xt=urn:btih:[A-Za-z0-9]+[^"]*)"/);
      if (!mm) continue;
      const magnet = mm[1].replace(/&/g, '&');
      const hash = ((magnet.match(/btih:([A-Za-z0-9]+)/) || [])[1] || '').toLowerCase();
      let sizeBytes = 0;
      const sm = page.match(/Size[\s\S]{0,200}?([\d.]+)\s*(Bytes|KB|MB|GB|TB)/i);
      if (sm) {
        const num = parseFloat(sm[1]);
        const u = { bytes: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 }[sm[2].toLowerCase()];
        sizeBytes = num * u;
      }
      const seedersMatch = page.match(/seeders[^0-9]*(\d+)/i) || page.match(/class="seeds"[^0-9]*(\d+)/i);
      items.push({
        title: r.title, hash, magnet, sizeBytes,
        seeders: parseInt(seedersMatch?.[1] || '0', 10), leechers: 0, source: '1337x',
      });
    } catch (_) { /* skip unreadable detail page */ }
  }
  return items;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const query = (body.query || '').trim();
    if (!query) return Response.json({ error: 'Missing query' }, { status: 400 });
    const year = body.year ? String(body.year) : '';
    const wantQuality = (body.quality || 'any').toLowerCase();
    const maxResults = parseInt(body.limit || 25, 10);

    const servers = await base44.entities.MediaServer.list('-created_date');
    const ad = (body.serverId && servers.find(s => s.id === body.serverId && s.server_type === 'alldebrid'))
      || servers.find(s => s.server_type === 'alldebrid' && s.is_active !== false)
      || servers.find(s => s.server_type === 'alldebrid');
    if (!ad) return Response.json({ error: 'No active AllDebrid server found' }, { status: 404 });
    const key = ad.api_token;
    if (!key) return Response.json({ error: 'Missing AllDebrid API key' }, { status: 400 });

    // 1. Scrape multiple indexes; keep the first that responds.
    const errors = [];
    let raw = [];
    const scrapers = [scrape1337x, scrapeApibay];
    for (const fn of scrapers) {
      try {
        const got = await fn(query, year);
        raw = raw.concat(got);
        if (raw.length >= 40) break;
      } catch (e) { errors.push(`${fn.name}: ${e.message}`); }
    }

    // De-duplicate by info hash, prefer the higher-seeder copy.
    const byHash = {};
    for (const r of raw) {
      if (!r.hash) continue;
      if (!byHash[r.hash] || r.seeders > byHash[r.hash].seeders) byHash[r.hash] = r;
    }
    let items = Object.values(byHash);

    // Mental sanity check — include only items whose title matches most query words.
    const qTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    items = items.filter(it => {
      const t = (it.title || '').toLowerCase();
      const hits = qTerms.filter(w => t.includes(w)).length;
      return hits >= Math.ceil(qTerms.length * 0.6);
    });

    // Optional quality filter (quality keyword must appear in title/badge).
    if (wantQuality && wantQuality !== 'any') {
      const qw = wantQuality.replace('p', '').replace('k', '').toLowerCase();
      items = items.filter(it => new RegExp(`${qw}`, 'i').test(qualityBadge(it.title) + ' ' + it.title));
    }

    // 2. Instant-availability check on AllDebrid (batch up to 15 magnets).
    const instantLookup = {};
    const toCheck = items.slice(0, 15);
    if (toCheck.length) {
      try {
        let url = `https://api.alldebrid.com/v4/api/magnet/instant?apikey=${encodeURIComponent(key)}`;
        for (const it of toCheck) url += `&magnets[]=${encodeURIComponent(it.magnet)}`;
        const res = await fetchWith(url, {}, 15000);
        if (res.ok) {
          const j = await res.json();
          for (const mm of (j?.data?.magnets || [])) {
            const h = ((mm.hash || (mm.magnet || '').match(/btih:([A-Za-z0-9]+)/)?.[1] || '') || '').toLowerCase();
            instantLookup[h] = !!mm.instant;
          }
        }
      } catch (e) { errors.push(`instant: ${e.message}`); }
    }
    items = items.map(it => ({ ...it, cached: !!instantLookup[(it.hash || '').toLowerCase()] }));

    // Rank: cached first, then seeders, then size.
    items.sort((a, b) => (b.cached ? 1 : 0) - (a.cached ? 1 : 0) || b.seeders - a.seeders || b.sizeBytes - a.sizeBytes);
    items = items.slice(0, maxResults).map(it => ({
      ...it, sizeLabel: formatSize(it.sizeBytes), quality: qualityBadge(it.title),
    }));

    const best = items.find(it => it.cached) || null;

    return Response.json({
      query,
      total: items.length,
      cachedMatches: items.filter(it => it.cached).length,
      items,
      bestMagnet: best ? best.magnet : null,
      bestHash: best ? best.hash : null,
      server: { id: ad.id, server_name: ad.server_name || 'AllDebrid' },
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}