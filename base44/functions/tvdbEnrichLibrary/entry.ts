import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TVDB_BASE = 'https://api4.thetvdb.com/v4';
let cachedToken = null;
let tokenExpiry = 0;

async function getTvdbToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const res = await fetch(`${TVDB_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: Deno.env.get('TVDB_API_KEY') }),
  });
  const data = await res.json();
  if (!data.data?.token) throw new Error('TVDB auth failed');
  cachedToken = data.data.token;
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
  return cachedToken;
}

async function tvdbFetch(path, token) {
  const res = await fetch(`${TVDB_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// Fast lookup: search only (1 API call per item, no extended fetch)
async function lookupOne(title, year, type, token) {
  const searchParams = new URLSearchParams({ query: title });
  if (type === 'movie') searchParams.set('type', 'movie');
  else if (type === 'tv_show') searchParams.set('type', 'series');

  const searchData = await tvdbFetch(`/search?${searchParams}`, token);
  const results = searchData?.data || [];
  if (!results.length) return null;

  let match = results[0];
  if (year) {
    const yearMatch = results.find(r => {
      const y = r.year || r.first_air_time?.slice(0, 4);
      return y && Math.abs(parseInt(y) - parseInt(year)) <= 1;
    });
    if (yearMatch) match = yearMatch;
  }

  const poster = match.image_url || match.thumbnail || null;
  const overview = match.overview || null;
  const genres = match.genres || [];

  return { poster, overview, genres };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Accept offset + batchSize to support paginated calls from the frontend
    const body = await req.json().catch(() => ({}));
    const offset = parseInt(body.offset ?? 0, 10);
    const batchSize = Math.min(parseInt(body.batchSize ?? 50, 10), 100);

    const token = await getTvdbToken();

    // Fetch one page of media needing enrichment
    // We fetch a larger window and filter client-side, then process batchSize items
    const FETCH_WINDOW = 500;
    const page = await base44.entities.Media.list('-created_date', FETCH_WINDOW, offset);

    // Count total for progress (fetch just count info)
    const firstPage = offset === 0
      ? await base44.entities.Media.list('-created_date', 1, 0)
      : null;

    const needsEnrichment = (page || []).filter(m =>
      !m.poster_url || !m.description || !m.genre?.length
    ).slice(0, batchSize);

    let enriched = 0;
    let failed = 0;

    for (const media of needsEnrichment) {
      try {
        const tvdb = await lookupOne(media.title, media.year, media.media_type, token);
        if (!tvdb) { failed++; continue; }

        const updates = {};
        if (tvdb.poster && !media.poster_url) updates.poster_url = tvdb.poster;
        if (tvdb.overview && !media.description) updates.description = tvdb.overview;
        if (tvdb.genres?.length && (!media.genre || !media.genre.length)) updates.genre = tvdb.genres;

        if (Object.keys(updates).length > 0) {
          await base44.entities.Media.update(media.id, updates);
          enriched++;
        }

        // Small delay to avoid TVDB rate limits
        await new Promise(r => setTimeout(r, 150));
      } catch (_) {
        failed++;
      }
    }

    const pageSize = page?.length ?? 0;
    const hasMore = pageSize === FETCH_WINDOW; // if we got a full window, there may be more

    return Response.json({
      enriched,
      failed,
      processed: needsEnrichment.length,
      hasMore,
      nextOffset: offset + FETCH_WINDOW,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});