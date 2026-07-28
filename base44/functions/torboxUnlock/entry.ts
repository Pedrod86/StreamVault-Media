import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { formatSize } from '../../shared/torrentScrape.ts';

// Unlocks a single magnet on the user's TorBox account and returns a direct,
// streamable CDN permalink (for the largest playable video file). Used for both
// autoplay of the best cached candidate and on-demand play of other results.

const TORBOX_API = 'https://api.torbox.app/v1';
const VIDEO_EXT = /\.(mp4|mkv|avi|mov|m4v|webm|mpg|mpeg|ts|wmv|flv|m2ts)$/i;
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
    const tb = servers.find(s => s.server_type === 'torbox' && s.is_active !== false)
      || servers.find(s => s.server_type === 'torbox');
    if (!tb) return Response.json({ error: 'No active TorBox server found' }, { status: 404 });
    const token = tb.api_token;
    if (!token) return Response.json({ error: 'Missing TorBox API key' }, { status: 400 });

    const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' };

    // Create the torrent in the user's TorBox account (idempotent — returns the
    // existing torrent when already added). Cached torrents complete almost instantly.
    const up = await fetch(`${TORBOX_API}/api/torrents/createtorrent`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ magnet, seed: 1, asQueued: true, allowZip: false }),
      signal: AbortSignal.timeout(15000),
    });
    if (up.status === 401 || up.status === 403) return Response.json({ error: 'Invalid TorBox API key. Re-copy it from your TorBox dashboard.' }, { status: 401 });
    const uj = await up.json().catch(() => ({}));
    const id = uj?.data?.torrent_id || uj?.data?.id;
    if (!id) return Response.json({ error: uj?.error?.message || 'TorBox did not return a torrent id' }, { status: 502 });

    // Poll the user's torrent list until this torrent is cached/completed.
    let torrent = null;
    for (let i = 0; i < 12; i++) {
      const lr = await fetch(`${TORBOX_API}/api/torrents/mylist?bypass_cache=false`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
      const lj = await lr.json().catch(() => ({}));
      const arr = Array.isArray(lj?.data) ? lj.data : [];
      torrent = arr.find(t => String(t.id) === String(id));
      if (torrent && (['completed', 'cached', 'seeding'].includes(torrent.download_state) || (torrent.progress ?? 0) >= 100)) break;
      await sleep(1500);
    }
    if (!torrent) return Response.json({ error: 'Torrent did not register in your TorBox account' }, { status: 502 });

    const files = (Array.isArray(torrent.files) ? torrent.files : []).filter(f => VIDEO_EXT.test(f.name || ''));
    if (!files.length) return Response.json({ error: 'No playable video files in this torrent' }, { status: 502 });

    const sorted = [...files].sort((a, b) => parseInt(b.size || 0, 10) - parseInt(a.size || 0, 10));
    const f = sorted[0];
    // Permanent CDN permalink (303 → direct stream URL on resolve). Stable across
    // CDN link rotation, so the player works even if the underlying link changes.
    const cdnUrl = `${TORBOX_API}/api/torrents/requestdl?token=${encodeURIComponent(token)}&torrent_id=${id}&file_id=${f.id}&redirect=true`;
    return Response.json({
      name: f.name || torrent.name,
      cdnUrl,
      sizeBytes: parseInt(f.size || 0, 10),
      sizeLabel: formatSize(parseInt(f.size || 0, 10)),
      fileCount: files.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}