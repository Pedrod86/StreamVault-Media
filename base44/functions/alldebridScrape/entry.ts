import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { scrapeTorrents, rankAndFinalize, pickBest } from '../../shared/torrentScrape.ts';

// Scrapes public torrent indexes for a title, then checks which results are
// instantly cached on the user's AllDebrid account. Returns the ranked list
// plus the best cached candidate's magnet — the frontend unlocks/plays it via
// the separate `alldebridUnlock` function on demand.

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
    const ad = (body.serverId && servers.find(s => s.id === body.serverId && s.server_type === 'alldebrid'))
      || servers.find(s => s.server_type === 'alldebrid' && s.is_active !== false)
      || servers.find(s => s.server_type === 'alldebrid');
    if (!ad) return Response.json({ error: 'No active AllDebrid server found' }, { status: 404 });
    const key = ad.api_token;
    if (!key) return Response.json({ error: 'Missing AllDebrid API key' }, { status: 400 });

    const { items, errors } = await scrapeTorrents(query, year, wantQuality, maxResults);

    // AllDebrid instant-availability check (batch up to 15 magnets).
    const instantLookup = {};
    const toCheck = items.slice(0, 15);
    if (toCheck.length) {
      try {
        let url = `https://api.alldebrid.com/v4/api/magnet/instant?apikey=${encodeURIComponent(key)}`;
        for (const it of toCheck) url += `&magnets[]=${encodeURIComponent(it.magnet)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (res.ok) {
          const j = await res.json();
          for (const mm of (j?.data?.magnets || [])) {
            const h = ((mm.hash || (mm.magnet || '').match(/btih:([A-Za-z0-9]+)/)?.[1] || '') || '').toLowerCase();
            instantLookup[h] = !!mm.instant;
          }
        }
      } catch (e) { errors.push(`instant: ${e.message}`); }
    }
    const itemsWithCache = items.map(it => ({ ...it, cached: !!instantLookup[(it.hash || '').toLowerCase()] }));
    const final = rankAndFinalize(itemsWithCache, maxResults);
    const best = pickBest(final);

    return Response.json({
      query,
      total: final.length,
      cachedMatches: final.filter(it => it.cached).length,
      items: final,
      bestMagnet: best ? best.magnet : null,
      bestHash: best ? best.hash : null,
      server: { id: ad.id, server_name: ad.server_name || 'AllDebrid' },
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}