// Normalizes a provider's JSON payload into StreamVault Media records.
// Accepts an array, or an object wrapping an array under a common key.

const ARRAY_KEYS = ['items', 'data', 'movies', 'shows', 'media', 'results', 'streams', 'vod', 'series'];

export function extractList(json) {
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object') {
    for (const k of ARRAY_KEYS) {
      if (Array.isArray(json[k])) return json[k];
    }
    // fall back to the first array-valued property
    const arr = Object.values(json).find(v => Array.isArray(v));
    if (arr) return arr;
  }
  return [];
}

const pick = (o, keys) => {
  for (const k of keys) {
    const v = o?.[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
};

const toArray = (v) => {
  if (!v) return undefined;
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return String(v).split(/[,|/]/).map(s => s.trim()).filter(Boolean);
};

const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

export function mapToMedia(raw) {
  const title = pick(raw, ['title', 'name', 'stream_display_name', 'movie_name', 'series_name']);
  if (!title) return null;

  const typeHint = String(pick(raw, ['media_type', 'type', 'stream_type', 'category']) || '').toLowerCase();
  const isShow = /series|tv|show|episode/.test(typeHint) || raw?.seasons || raw?.season_count;

  const yearRaw = pick(raw, ['year', 'releaseYear', 'release_year', 'releasedate', 'release_date', 'added']);

  return {
    title: String(title).trim(),
    media_type: isShow ? 'tv_show' : 'movie',
    year: num(String(yearRaw || '').slice(0, 4)),
    rating: num(pick(raw, ['rating', 'rating_5based', 'vote_average', 'imdb_rating'])),
    duration_minutes: num(pick(raw, ['duration_minutes', 'runtime', 'episode_run_time'])),
    description: pick(raw, ['description', 'plot', 'overview', 'summary']),
    poster_url: pick(raw, ['poster_url', 'poster', 'stream_icon', 'cover', 'cover_big', 'image', 'movie_image']),
    backdrop_url: pick(raw, ['backdrop_url', 'backdrop', 'backdrop_path', 'fanart']),
    video_url: pick(raw, ['video_url', 'stream_url', 'url', 'direct_source', 'link']),
    genre: toArray(pick(raw, ['genre', 'genres', 'category_name'])),
    cast: toArray(pick(raw, ['cast', 'actors'])),
    director: pick(raw, ['director', 'directors']),
    studio: pick(raw, ['studio', 'network']),
    season_count: num(pick(raw, ['season_count', 'seasons_count'])),
    episode_count: num(pick(raw, ['episode_count', 'episodes_count'])),
  };
}

export function parseProviderJson(json) {
  return extractList(json).map(mapToMedia).filter(Boolean);
}