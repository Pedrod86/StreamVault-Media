import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Module-level server cache — avoids hitting DB on every request
let _serverCache = null;
let _serverCacheAt = 0;
const SERVER_CACHE_TTL = 5 * 60 * 1000;

async function getEmbyServer(base44) {
  const now = Date.now();
  if (_serverCache && (now - _serverCacheAt) < SERVER_CACHE_TTL) return _serverCache;
  const servers = await base44.entities.MediaServer.list();
  const server = servers.find(s => s.server_type === 'emby' && s.is_active !== false) || null;
  _serverCache = server;
  _serverCacheAt = now;
  return server;
}

async function doFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function buildImageUrl(base, itemId, token, type = 'Primary') {
  return `${base}/Items/${itemId}/Images/${type}?api_key=${token}&MaxWidth=400`;
}

async function resolveUserId(base, token) {
  try {
    const me = await doFetch(`${base}/Users/Me?api_key=${token}`);
    if (me?.Id) return me.Id;
  } catch (_) {}
  try {
    const users = await doFetch(`${base}/Users?api_key=${token}`);
    const list = Array.isArray(users) ? users : (users?.Items || []);
    const admin = list.find(u => u.Policy?.IsAdministrator) || list[0];
    if (admin?.Id) return admin.Id;
  } catch (_) {}
  throw new Error('Could not authenticate with Emby.');
}

const FIELDS = 'Overview,Genres,OfficialRating,CommunityRating,ProductionYear,RunTimeTicks,ImageTags,BackdropImageTags,MediaStreams,Height,Width,Tags';

function mapItem(base, token, item) {
  const height = item.Height || 0;
  const videoStream = (item.MediaStreams || []).find(s => s.Type === 'Video');
  const streamHeight = videoStream?.Height || 0;
  const maxHeight = Math.max(height, streamHeight);
  const embyTags = (item.Tags || []).map(t => String(t).toLowerCase());
  const is4k = maxHeight >= 2160 ||
    /\b(4K|UHD|2160p)\b/i.test(item.Name || '') ||
    (item.MediaStreams || []).some(s => s.Type === 'Video' && (s.Width >= 3840 || s.Height >= 2160)) ||
    embyTags.some(t => /4k|uhd|2160p/.test(t));

  return {
    id: item.Id,
    title: item.Name,
    type: item.Type,
    year: item.ProductionYear || null,
    rating: item.CommunityRating ? parseFloat(Number(item.CommunityRating).toFixed(1)) : null,
    overview: item.Overview || '',
    genres: item.Genres || [],
    contentRating: item.OfficialRating || null,
    posterUrl: item.ImageTags?.Primary ? buildImageUrl(base, item.Id, token, 'Primary') : null,
    backdropUrl: item.BackdropImageTags?.[0] ? buildImageUrl(base, item.Id, token, 'Backdrop') : null,
    is4k,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const server = await getEmbyServer(base44);
    if (!server) return Response.json({ rows: {} });

    const base = server.server_url.replace(/\/$/, '');
    const token = server.api_token;
    const userId = await resolveUserId(base, token);

    const KIDS_GENRES = 'Kids,Children,Family';
    const LIMIT = 20;

    const itemsUrl = (params) =>
      `${base}/Users/${userId}/Items?Recursive=true&Fields=${FIELDS}&api_key=${token}&${params}`;

    const [
      recentMoviesRaw,
      recentShowsRaw,
      fourKMoviesRaw,
      fourKShowsRaw,
      kidsShowsRaw,
    ] = await Promise.all([
      // Recently added movies
      doFetch(itemsUrl(`IncludeItemTypes=Movie&SortBy=DateCreated&SortOrder=Descending&Limit=${LIMIT}`)),
      // Recently added TV shows
      doFetch(itemsUrl(`IncludeItemTypes=Series&SortBy=DateCreated&SortOrder=Descending&Limit=${LIMIT}`)),
      // 4K movies (filter client-side, fetch a wider set sorted by newest)
      doFetch(itemsUrl(`IncludeItemTypes=Movie&SortBy=DateCreated&SortOrder=Descending&Limit=120`)),
      // 4K TV shows
      doFetch(itemsUrl(`IncludeItemTypes=Series&SortBy=DateCreated&SortOrder=Descending&Limit=120`)),
      // Kids TV
      doFetch(itemsUrl(`IncludeItemTypes=Series&Genres=${encodeURIComponent(KIDS_GENRES)}&SortBy=SortName&SortOrder=Ascending&Limit=${LIMIT}`)),
    ]);

    const map = (raw) => (raw?.Items || []).map(i => mapItem(base, token, i));

    const recentMovies = map(recentMoviesRaw);
    const recentShows = map(recentShowsRaw);
    const fourKMovies = map(fourKMoviesRaw).filter(i => i.is4k).slice(0, LIMIT);
    const fourKShows = map(fourKShowsRaw).filter(i => i.is4k).slice(0, LIMIT);
    const kidsShows = map(kidsShowsRaw);

    return Response.json({
      rows: {
        recentMovies,
        recentShows,
        fourKMovies,
        fourKShows,
        kidsShows,
      },
      server: { id: server.id, server_name: server.server_name, server_url: base, api_token: token },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});