/**
 * Emby → StreamVault Media format mapper
 *
 * Handles all field translation, image URL construction, rating
 * normalisation, content-rating mapping, and title sanitisation.
 */

// Emby OfficialRating values → StreamVault content_rating enum
const CONTENT_RATING_MAP = {
  'G': 'G',
  'PG': 'PG',
  'PG-13': 'PG-13',
  'PG13': 'PG-13',
  'R': 'R',
  'NC-17': 'NC-17',
  'NC17': 'NC-17',
  'TV-Y': 'TV-Y',
  'TVY': 'TV-Y',
  'TV-G': 'TV-G',
  'TVG': 'TV-G',
  'TV-PG': 'TV-PG',
  'TVPG': 'TV-PG',
  'TV-14': 'TV-14',
  'TV14': 'TV-14',
  'TV-MA': 'TV-MA',
  'TVMA': 'TV-MA',
};

/**
 * Normalise a rating value to a 1-decimal float clamped to 0–10,
 * returning undefined if unavailable or invalid.
 */
function normaliseRating(raw) {
  if (raw == null) return undefined;
  const n = parseFloat(raw);
  if (isNaN(n) || n <= 0) return undefined;
  return parseFloat(Math.min(10, Math.max(0, n)).toFixed(1));
}

/**
 * Map an Emby OfficialRating string to a StreamVault content_rating enum value.
 * Returns undefined if unrecognised.
 */
function mapContentRating(officialRating) {
  if (!officialRating) return undefined;
  const key = officialRating.trim().toUpperCase().replace(/\s/g, '');
  // Direct lookup
  const direct = CONTENT_RATING_MAP[officialRating.trim()];
  if (direct) return direct;
  // Normalised lookup
  for (const [k, v] of Object.entries(CONTENT_RATING_MAP)) {
    if (k.toUpperCase().replace(/\s/g, '') === key) return v;
  }
  return undefined;
}

/**
 * Strip invisible Unicode control/formatting characters from titles
 * (e.g. U+200E LEFT-TO-RIGHT MARK that Emby sometimes prepends).
 */
function cleanTitle(name) {
  if (!name) return '';
  return name.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '').trim();
}

/**
 * Pull the video resolution (height/width) from an Emby item. Emby exposes it
 * either at the top level (Width/Height) or on the primary media source's video
 * MediaStream. Returns { height, width } with 0s when unavailable.
 */
function extractResolution(item) {
  let height = Number(item.Height) || 0;
  let width = Number(item.Width) || 0;
  if (!height || !width) {
    const streams = item.MediaSources?.[0]?.MediaStreams || item.MediaStreams || [];
    const video = streams.find(s => s.Type === 'Video');
    if (video) {
      height = height || Number(video.Height) || 0;
      width = width || Number(video.Width) || 0;
    }
  }
  return { height, width };
}

/** Short resolution label from height/width, mirroring src/lib/resolutionLabel.js. */
function resolutionLabelFrom(height, width) {
  const h = Number(height) || 0;
  const w = Number(width) || 0;
  if (!h && !w) return undefined;
  if (h >= 4320 || w >= 7680) return '8K';
  if (h >= 2000 || w >= 3800) return '4K';
  if (h >= 1400 || w >= 2400) return '1440p';
  if (h >= 1000 || w >= 1800) return '1080p';
  if (h >= 700 || w >= 1200) return '720p';
  if (h >= 550 || w >= 900) return '576p';
  if (h > 0) return 'SD';
  return undefined;
}

/**
 * Build the Emby image URL for a given item and image type.
 * Uses the token as a query param (api_key) which Emby accepts.
 */
function imageUrl(base, itemId, type, tag, token) {
  if (!tag) return undefined;
  return `${base}/Items/${itemId}/Images/${type}/0?tag=${tag}&api_key=${token}&maxWidth=400`;
}

function backdropUrl(base, itemId, tags, token) {
  if (!tags || !tags.length) return undefined;
  return `${base}/Items/${itemId}/Images/Backdrop/0?tag=${tags[0]}&api_key=${token}&maxWidth=1280`;
}

/**
 * Map a single Emby API item to the StreamVault Media entity format.
 *
 * @param {object} item  - Raw item from Emby /Users/{id}/Items response
 * @param {string} base  - Server base URL (no trailing slash)
 * @param {string} token - Emby API token
 * @returns {object}     - StreamVault-compatible Media object
 */
export function mapEmbyItem(item, base, token) {
  const isMovie = item.Type === 'Movie';
  const isSeries = item.Type === 'Series';
  const { height, width } = extractResolution(item);

  const poster = imageUrl(base, item.Id, 'Primary', item.ImageTags?.Primary, token);
  const backdrop = backdropUrl(base, item.Id, item.BackdropImageTags, token);
  const videoUrl = isMovie
    ? `${base}/Videos/${item.Id}/stream?api_key=${token}&Static=true`
    : undefined;

  return {
    title: cleanTitle(item.Name),
    media_type: isSeries ? 'tv_show' : 'movie',
    description: item.Overview || '',
    year: item.ProductionYear ? Number(item.ProductionYear) : undefined,
    rating: normaliseRating(item.CommunityRating),
    duration_minutes: item.RunTimeTicks
      ? Math.round(item.RunTimeTicks / 600000000)
      : undefined,
    poster_url: poster,
    backdrop_url: backdrop,
    video_url: videoUrl,
    genre: Array.isArray(item.Genres) ? item.Genres : [],
    director: item.People?.find(p => p.Type === 'Director')?.Name || undefined,
    cast: item.People
      ?.filter(p => p.Type === 'Actor')
      .slice(0, 8)
      .map(p => p.Name) || [],
    studio: item.Studios?.[0]?.Name || undefined,
    content_rating: mapContentRating(item.OfficialRating),
    resolution: resolutionLabelFrom(height, width),
    season_count: isSeries && item.ChildCount ? Number(item.ChildCount) : undefined,
    episode_count: isSeries && item.RecursiveItemCount ? Number(item.RecursiveItemCount) : undefined,
    // Persist the Emby item ID as a tag so series (which have no video_url)
    // can resolve their Emby ID for episode browsing/playback.
    tags: item.Id ? ['emby', `emby:${item.Id}`] : ['emby'],
  };
}