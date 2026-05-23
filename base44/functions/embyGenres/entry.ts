import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function doFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const itemType = body.itemType || 'Movie';

    const servers = await base44.entities.MediaServer.list();
    const server = servers.find(s => s.server_type === 'emby' && s.is_active !== false);
    if (!server) return Response.json({ error: 'No active Emby server found' }, { status: 404 });

    const base = server.server_url.replace(/\/$/, '');
    const token = server.api_token;
    const userId = await resolveUserId(base, token);

    const json = await doFetch(
      `${base}/Users/${userId}/Items?IncludeItemTypes=${itemType}&Recursive=true` +
      `&Fields=Genres&Limit=1000&StartIndex=0&api_key=${token}`
    );

    const genreSet = new Set();
    for (const item of json?.Items || []) {
      for (const g of item.Genres || []) {
        if (g) genreSet.add(g);
      }
    }

    // Also try the dedicated Genres endpoint
    try {
      const gJson = await doFetch(`${base}/Genres?api_key=${token}&UserId=${userId}&IncludeItemTypes=${itemType}&Recursive=true`);
      for (const g of gJson?.Items || []) {
        if (g.Name) genreSet.add(g.Name);
      }
    } catch (_) {}

    return Response.json({ genres: [...genreSet].sort() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});