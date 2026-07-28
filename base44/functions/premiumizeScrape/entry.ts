import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { scrapeTorrents, rankAndFinalize, pickBest } from '../../shared/torrentScrape.ts';

// Scrapes public torrent indexes for a title, then checks which results are
// cached on the user's Premiumize account (via POST /api/cache/check). Returns
// the ranked list plus the best cached candidate's magnet — the frontend
// unlocks/plays it via the separate `premiumizeUnlock` function on demand.

const PREMIUMIZE_API = 'https://premiumize.me/api';

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
    const pm = (body.serverId && servers.find(s => s.id === body.serverId && s.server_type === 'premiumize'))
      || servers.find(s => s.server_type === 'premiumize' && s.is_active !== false)
      || servers.find(s => s.server_type === 'premiumize');
    if (!pm) return Response.json({ error: 'No active Premiumize server found' }, { status: 404 });
    const key = pm.api_token;
    if (!key) return Response.json({ error: 'Missing Premiumize API key' }, { status: 400 });

    const { items, errors } = await scrapeTorrents(query, year, wantQuality, maxResults);

    // Premiumize cache check (batch up to 15 magnets).
    const cachedFlags = [];
    const toCheck = items.slice(0, 15).filter(it => it.magnet);
    if (toCheck.length) {
      try {
        const form = new URLSearchParams();
        toCheck.forEach(it => form.append('items[]', it.magnet));
        const res = await fetch(`${PREMIUMIZE_API}/cache/check?apikey=${encodeURIComponent(key)}`, {
          method: 'POST', body: form, signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (res.ok) {
          const j = await res.json();
          const resp = j?.data?.response || j?.response;
          if (Array.isArray(resp)) for (let i = 0; i < resp.length; i++) cachedFlags[i] = !!resp[i];
        }
      } catch (e) { errors.push(`cache: ${e.message}`); }
    }
    const itemsWithCache = items.map((it, i) => ({ ...it, cached: i < toCheck.length ? !!cachedFlags[i] : false }));
    const final = rankAndFinalize(itemsWithCache, maxResults);
    const best = pickBest(final);

    return Response.json({
      query,
      total: final.length,
      cachedMatches: final.filter(it => it.cached).length,
      items: final,
      bestMagnet: best ? best.magnet : null,
      bestHash: best ? best.hash : null,
      server: { id: pm.id, server_name: pm.server_name || 'Premiumize' },
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}