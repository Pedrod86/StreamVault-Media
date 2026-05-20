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
  if (!data.data?.token) throw new Error('TVDB auth failed: ' + JSON.stringify(data));
  cachedToken = data.data.token;
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
  return cachedToken;
}

async function tvdbFetch(path, token) {
  const res = await fetch(`${TVDB_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`TVDB ${path} returned ${res.status}`);
  return res.json();
}

async function lookupOne(title, year, type, token) {
  const searchParams = new URLSearchParams({ query: title });
  if (type === 'movie') searchParams.set('type', 'movie');
  else if (type === 'tv_show') searchParams.set('type', 'series');

  const searchData = await tvdbFetch(`/search?${searchParams}`, token);
  const results = searchData.data || [];
  if (!results.length) return null;

  let match = results[0];
  if (year) {
    const yearMatch = results.find(r => {
      const y = r.year || r.first_air_time?.slice(0, 4);
      return y && Math.abs(parseInt(y) - parseInt(year)) <= 1;
    });
    if (yearMatch) match = yearMatch;
  }

  const entityType = match.type;
  const id = match.tvdb_id || match.id;

  let extended = null;
  try {
    const endpoint = entityType === 'movie' ? `/movies/${id}/extended` : `/series/${id}/extended`;
    const d = await tvdbFetch(endpoint, token);
    extended = d.data;
  } catch (_) {}

  const getImage = (artworks, t) => {
    const art = artworks?.find(a => a.type === t && a.language === 'eng') || artworks?.find(a => a.type === t);
    return art?.image || null;
  };

  const artworks = extended?.artworks || [];
  const poster = getImage(artworks, 2) || match.image_url || match.thumbnail || null;
  const backdrop = getImage(artworks, 3) || null;
  const genres = extended?.genres?.map(g => g.name) || match.genres || [];
  const overview = extended?.overview || match.overview || null;
  const seasonCount = entityType === 'series'
    ? (extended?.seasons?.filter(s => s.type?.type === 'official' && s.number > 0).length || null)
    : null;
  const rating = extended?.averageScore ? parseFloat(Number(extended.averageScore / 10).toFixed(1)) : null;
  const contentRating = extended?.contentRatings?.[0]?.name || null;

  return { poster, backdrop, overview, genres, seasonCount, rating, contentRating };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const token = await getTvdbToken();

    // Fetch all media for this user (paginated)
    let allMedia = [];
    let skip = 0;
    const limit = 200;
    while (true) {
      const page = await base44.entities.Media.list('-created_date', limit, skip);
      if (!page || page.length === 0) break;
      allMedia = allMedia.concat(page);
      if (page.length < limit) break;
      skip += limit;
    }

    // Filter to items that are missing key metadata
    const needsEnrichment = allMedia.filter(m =>
      !m.poster_url || !m.description || !m.genre?.length
    );

    let enriched = 0;
    let failed = 0;
    const DELAY = 300; // ms between requests to avoid rate limiting

    for (const media of needsEnrichment) {
      try {
        const tvdb = await lookupOne(media.title, media.year, media.media_type, token);
        if (!tvdb) { failed++; continue; }

        const updates = {};
        if (tvdb.poster && !media.poster_url) updates.poster_url = tvdb.poster;
        if (tvdb.backdrop && !media.backdrop_url) updates.backdrop_url = tvdb.backdrop;
        if (tvdb.overview && !media.description) updates.description = tvdb.overview;
        if (tvdb.genres?.length && (!media.genre || !media.genre.length)) updates.genre = tvdb.genres;
        if (tvdb.rating && !media.rating) updates.rating = tvdb.rating;
        if (tvdb.seasonCount && !media.season_count) updates.season_count = tvdb.seasonCount;
        if (tvdb.contentRating && !media.content_rating) updates.content_rating = tvdb.contentRating;

        if (Object.keys(updates).length > 0) {
          await base44.entities.Media.update(media.id, updates);
          enriched++;
        }

        await new Promise(r => setTimeout(r, DELAY));
      } catch (_) {
        failed++;
      }
    }

    return Response.json({
      total: needsEnrichment.length,
      enriched,
      failed,
      skipped: needsEnrichment.length - enriched - failed,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});