import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Module-level server cache — avoids hitting DB on every request
let _serverCache = null;
let _serverCacheAt = 0;
const SERVER_CACHE_TTL = 5 * 60 * 1000;

async function getPlexServer(base44) {
  const now = Date.now();
  if (_serverCache && (now - _serverCacheAt) < SERVER_CACHE_TTL) return _serverCache;
  const servers = await base44.entities.MediaServer.list();
  const server = servers.find(s => s.server_type === 'plex' && s.is_active !== false) || null;
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

// Plex image transcode URL — keeps posters small and authenticated.
function buildImageUrl(base, thumb, token) {
  if (!thumb) return null;
  const path = encodeURIComponent(thumb);
  return `${base}/photo/:/transcode?width=400&height=600&minSize=1&url=${path}&X-Plex-Token=${token}`;
}

function mapItem(base, token, item) {
  const is4k = (item.Media || []).some(m => (m.videoResolution || '').toLowerCase() === '4k') ||
    /\b(4K|UHD|2160p)\b/i.test(item.title || '');

  return {
    id: item.ratingKey,
    title: item.title,
    type: item.type === 'show' ? 'Series' : 'Movie',
    year: item.year || null,
    rating: item.rating ? parseFloat(Number(item.rating).toFixed(1)) : null,
    overview: item.summary || '',
    genres: (item.Genre || []).map(g => g.tag),
    posterUrl: buildImageUrl(base, item.thumb, token),
    is4k,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const server = await getPlexServer(base44);
    if (!server) return Response.json({ views: [] });

    const base = (server.server_url || '').replace(/\/web\/?$/, '').replace(/\/$/, '');
    const token = server.plex_token || server.api_token;
    if (!base || !token) return Response.json({ views: [] });

    // Fetch the library sections (Movies, TV Shows, etc.)
    const sectionsRaw = await doFetch(`${base}/library/sections?X-Plex-Token=${token}`);
    const sections = (sectionsRaw?.MediaContainer?.Directory || []).filter(
      s => ['movie', 'show'].includes((s.type || '').toLowerCase())
    );

    const LIMIT = 20;

    const rows = await Promise.all(sections.map(async (section) => {
      const url = `${base}/library/sections/${section.key}/all?sort=addedAt:desc&X-Plex-Container-Start=0&X-Plex-Container-Size=${LIMIT}&X-Plex-Token=${token}`;
      let items = [];
      try {
        const raw = await doFetch(url);
        items = (raw?.MediaContainer?.Metadata || []).map(i => mapItem(base, token, i));
      } catch (_) {}
      return { id: section.key, name: section.title, items };
    }));

    return Response.json({
      views: rows.filter(r => r.items.length > 0),
      server: { id: server.id, server_name: server.server_name, server_url: base, plex_token: token },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});