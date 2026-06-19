import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function withRetry(fn) {
  let delay = 600;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const is429 = e?.status === 429 || /rate limit/i.test(e?.message || '');
      if (!is429 || attempt === 4) throw e;
      await sleep(delay);
      delay *= 2;
    }
  }
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

async function resolveUserId(base, token) {
  try {
    const me = await doFetch(`${base}/Users/Me?api_key=${token}`);
    if (me?.Id) return me.Id;
  } catch (_) {}
  const users = await doFetch(`${base}/Users?api_key=${token}`);
  const list = Array.isArray(users) ? users : (users?.Items || []);
  const admin = list.find(u => u.Policy?.IsAdministrator) || list[0];
  if (admin?.Id) return admin.Id;
  throw new Error('Could not authenticate with Emby. Check your API token.');
}

const norm = (s) => (s || '').toLowerCase().trim().replace(/[\u200e\u200f]/g, '');

function hasEmbyId(m) {
  if (m.emby_id) return true;
  return Array.isArray(m.tags) && m.tags.some(t => typeof t === 'string' && t.startsWith('emby:'));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await withRetry(() => base44.auth.me());
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const servers = await withRetry(() => base44.entities.MediaServer.list());
    const server = servers.find(s => s.server_type === 'emby' && s.is_active !== false);
    if (!server) return Response.json({ error: 'No active Emby server found' }, { status: 404 });

    const base = server.server_url.replace(/\/$/, '');
    const token = server.api_token;
    const userId = await resolveUserId(base, token);

    // Build a title|type -> Emby ID map from the server (movies + series)
    const json = await doFetch(
      `${base}/Users/${userId}/Items?IncludeItemTypes=Movie,Series&Recursive=true` +
      `&Fields=ProductionYear&Limit=10000&api_key=${token}`
    );
    const embyMap = new Map();
    for (const it of (json?.Items || [])) {
      const type = it.Type === 'Series' ? 'tv_show' : 'movie';
      embyMap.set(`${norm(it.Name)}|${type}`, it.Id);
    }

    // Load local media missing Emby IDs
    const localMedia = await withRetry(
      () => base44.entities.Media.filter({ tags: 'emby' }, '-created_date', 5000)
    );
    const missing = localMedia.filter(m => !hasEmbyId(m));

    let patched = 0;
    let unmatched = 0;
    for (const m of missing) {
      const id = embyMap.get(`${norm(m.title)}|${m.media_type}`);
      if (!id) { unmatched++; continue; }
      const tags = Array.isArray(m.tags) ? [...m.tags] : [];
      if (!tags.includes(`emby:${id}`)) tags.push(`emby:${id}`);
      await withRetry(() => base44.entities.Media.update(m.id, { emby_id: id, tags }));
      patched++;
      await sleep(150);
    }

    return Response.json({
      success: true,
      checked: missing.length,
      patched,
      unmatched,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});