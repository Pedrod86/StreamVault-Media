import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { scrapeTorrents, rankAndFinalize, pickBest } from '../../shared/torrentScrape.ts';

// Scrapes public torrent indexes for a title, then checks which results are
// cached on the user's TorBox account (via /torrents/checkcached). Returns the
// ranked list plus the best cached candidate's magnet — the frontend unlocks/
// plays it via the separate `torboxUnlock` function on demand.

const TORBOX_API = 'https://api.torbox.app/v1';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const query = (body.query || '').trim();
    if (!query) return Response.json({ error: 'Missing query' }, { status: 400 });
    const year = body.year ? String(body.year) : '';
    const wantQuality = (body.quantity || body.quality || 'any').toLowerCase();
    const maxResults = parseInt(body.limit || 25, 10);

    const servers = await base44.entities.MediaServer.list('-created_date');
    const tb = (body.serverId && servers.find(s => s.id === body.serverId && s.server_type === 'torbox'))
      || servers.find(s => s.server_type === 'torbox' && s.is_active !== false)
      || servers.find(s => s.server_type === 'torbox');
    if (!tb) return Response.json({ error: 'No active TorBox server found' }, { status: 404 });
    const token = tb.api_token;
    if (!token) return Response.json({ error: 'Missing TorBox API key' }, { status: 400 });

    const { items, errors } = await scrapeTorrents(query, year, wantQuality, maxResults);

    // TorBox cached-availability check (batch up to 30 hashes).
    const cachedSet = new Set();
    const toCheck = items.slice(0, 30);
    if (toCheck.length) {
      try {
        let url = `${TORBOX_API}/api/torrents/checkcached?format=list&list_files=false`;
        for (const it of toCheck) url += `&hash=${encodeURIComponent(it.hash)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const j = await res.json();
          const d = j?.data;
          if (Array.isArray(d)) for (const h of d) cachedSet.add(String(h).toLowerCase());
          else if (d && typeof d === 'object') for (const h of Object.keys(d)) cachedSet.add(h.toLowerCase());
        }
      } catch (e) { errors.push(`checkcached: ${e.message}`); }
    }
    const itemsWithCache = items.map(it => ({ ...it, cached: cachedSet.has((it.hash || '').toLowerCase()) }));
    const final = rankAndFinalize(itemsWithCache, maxResults);
    const best = pickBest(final);

    return Response.json({
      query,
      total: final.length,
      cachedMatches: final.filter(it => it.cached).length,
      items: final,
      bestMagnet: best ? best.magnet : null,
      bestHash: best ? best.hash : null,
      server: { id: tb.id, server_name: tb.server_name || 'TorBox' },
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}