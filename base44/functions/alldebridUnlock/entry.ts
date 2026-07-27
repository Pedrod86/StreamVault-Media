import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Unlocks a single magnet on the user's AllDebrid account and returns a direct,
// streamable CDN URL (plus the largest playable file). Used for both autoplay
// of the best cached candidate and on-demand play of any other cached result.

const ALLDEBRID_API = 'https://api.alldebrid.com/v4';

function formatSize(bytes = 0) {
  if (!bytes) return null;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

async function ad(data, key, path, ms = 15000) {
  const r = await fetch(`${ALLDEBRID_API}${path}`, {
    signal: AbortSignal.timeout(ms),
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36' },
  });
  if (!r.ok) throw new Error(`AllDebrid HTTP ${r.status}`);
  const j = await r.json();
  if (j.status !== 'success') throw new Error(j?.error?.message || 'AllDebrid error');
  return j.data;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const magnet = (body.magnet || '').trim();
    if (!magnet) return Response.json({ error: 'magnet required' }, { status: 400 });

    const servers = await base44.entities.MediaServer.list('-created_date');
    const ad0 = servers.find(s => s.server_type === 'alldebrid' && s.is_active !== false)
      || servers.find(s => s.server_type === 'alldebrid');
    if (!ad0) return Response.json({ error: 'No active AllDebrid server found' }, { status: 404 });
    const key = ad0.api_token;
    if (!key) return Response.json({ error: 'Missing AllDebrid API key' }, { status: 400 });

    // Upload the magnet (idempotent — returns the existing torrent if already added).
    const up = await ad(base44, key, `/api/magnet/upload?apikey=${encodeURIComponent(key)}&magnet=${encodeURIComponent(magnet)}`);
    const id = up?.magnets?.[0]?.id;
    if (!id) throw new Error('AllDebrid did not return a torrent id');

    // Poll magnet status until its file links are ready. For instant-cached
    // magnets this resolves on the first try.
    let links = [];
    let fallbackName = '';
    for (let i = 0; i < 12; i++) {
      const st = await ad(base44, key, `/api/magnet/status?apikey=${encodeURIComponent(key)}&id=${id}`);
      const m = (st?.magnets || []).find(x => String(x.id) === String(id)) || st?.magnets?.[0];
      if (m?.filename) fallbackName = m.filename;
      if (m?.links?.length) { links = m.links; break; }
      await sleep(1500);
    }
    if (!links.length) return Response.json({ error: 'Torrent still downloading — try again shortly' }, { status: 502 });

    // Pick the largest file (most likely the main feature) and unlock it.
    const sorted = [...links].sort((a, b) => parseInt(b.size || 0, 10) - parseInt(a.size || 0, 10));
    for (const l of sorted) {
      try {
        const ud = await ad(base44, key, `/api/unlock/link?apikey=${encodeURIComponent(key)}&link=${encodeURIComponent(l.link)}`);
        const cdnUrl = ud?.link || ud?.stream_link || null;
        if (cdnUrl) {
          const sizeBytes = parseInt(ud?.filesize || l.size || 0, 10);
          return Response.json({
            name: ud?.filename || l.filename || fallbackName || 'AllDebrid stream',
            cdnUrl,
            sizeBytes,
            sizeLabel: formatSize(sizeBytes),
            fileCount: sorted.length,
          });
        }
      } catch (_) { /* try next file */ }
    }
    return Response.json({ error: 'Could not unlock the file' }, { status: 502 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}