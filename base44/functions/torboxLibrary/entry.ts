import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const TORBOX_API = 'https://api.torbox.app/v1';
const VIDEO_EXT = /\.(mp4|mkv|avi|mov|m4v|webm|mpg|mpeg|ts|wmv|flv|m2ts)$/i;

function isVideo(name = '') {
  return VIDEO_EXT.test(name);
}

// Best-effort type inference from the torrent/file name.
function inferType(name = '') {
  const n = (name || '').toLowerCase();
  if (/[\s._-]s\d{1,2}e\d{1,2}[\s._-]/i.test(name + ' ')) return 'tv_show';
  if (/season\s?\d|s\d{2}\s|complete\s|tv\s?series|episode/i.test(n)) return 'tv_show';
  return 'movie';
}

function formatSize(bytes = 0) {
  if (!bytes) return null;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

// Build a TorBox permanent download permalink — redirects to the CDN when clicked.
// Permalinks are stable and survive CDN link rotation, so the app doesn't need to
// re-request short-lived links for every playback.
function dlLink(token, torrentId, fileId) {
  return `${TORBOX_API}/api/torrents/requestdl?token=${encodeURIComponent(token)}&torrent_id=${torrentId}&file_id=${fileId}&redirect=true`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const servers = await base44.entities.MediaServer.list('-created_date');
    const torboxServers = servers.filter(s => s.server_type === 'torbox' && s.is_active !== false);
    const server = (body.serverId && torboxServers.find(s => s.id === body.serverId)) || torboxServers[0];
    if (!server) return Response.json({ error: 'No active TorBox server found' }, { status: 404 });

    const token = server.api_token;
    if (!token) return Response.json({ error: 'Missing TorBox API key' }, { status: 400 });

    const listUrl = `${TORBOX_API}/api/torrents/mylist?bypass_cache=${body.bypass_cache ? 'true' : 'false'}`;
    const res = await fetch(listUrl, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 401 || res.status === 403) {
      return Response.json({ error: 'Invalid TorBox API key. Re-copy it from your TorBox dashboard.' }, { status: 401 });
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return Response.json({ error: `TorBox returned HTTP ${res.status}. ${text.slice(0, 200)}` }, { status: 502 });
    }
    const json = await res.json();
    const torrents = Array.isArray(json?.data) ? json.data : [];

    const items = torrents
      .filter(t => t && (t.download_state === 'completed' || t.download_state === 'cached' || t.progress >= 100))
      .map(t => {
        const files = (Array.isArray(t.files) ? t.files : [])
          .filter(f => isVideo(f.name || ''))
          .map(f => ({
            id: f.id,
            name: f.name,
            sizeBytes: f.size || 0,
            sizeLabel: formatSize(f.size),
            streamUrl: dlLink(token, t.id, f.id),
          }));
        const baseTitle = (t.name || '').replace(/\.[a-z0-9]{2,4}$/i, '').trim() || t.name || 'Untitled';
        return {
          id: `torbox:${t.id}`,
          torrentId: t.id,
          title: baseTitle,
          state: t.download_state,
          progress: t.progress,
          sizeBytes: t.size || 0,
          sizeLabel: formatSize(t.size),
          mediaType: inferType(t.name),
          fileCount: files.length,
          files,
          streamUrl: files[0]?.streamUrl || null,
          server: { id: server.id, server_name: server.server_name },
        };
      });

    return Response.json({
      items,
      totalTorrents: torrents.length,
      completed: items.length,
      server: { id: server.id, server_name: server.server_name || 'TorBox' },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}