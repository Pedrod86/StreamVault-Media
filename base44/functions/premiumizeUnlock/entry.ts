import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { formatSize } from '../../shared/torrentScrape.ts';

// Unlocks a single magnet on the user's Premiumize account and returns a
// direct, streamable CDN URL (for the largest playable file). Used for both
// autoplay of the best cached candidate and on-demand play of other results.

const PREMIUMIZE_API = 'https://premiumize.me/api';
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
    const pm = servers.find(s => s.server_type === 'premiumize' && s.is_active !== false)
      || servers.find(s => s.server_type === 'premiumize');
    if (!pm) return Response.json({ error: 'No active Premiumize server found' }, { status: 404 });
    const key = pm.api_token;
    if (!key) return Response.json({ error: 'Missing Premiumize API key' }, { status: 400 });

    // Create the transfer (Premiumize supports magnet src directly).
    const createForm = new URLSearchParams({ src: magnet });
    const cr = await fetch(`${PREMIUMIZE_API}/transfer/create?apikey=${encodeURIComponent(key)}`, {
      method: 'POST', body: createForm, signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const cj = await cr.json().catch(() => ({}));
    const transferId = cj?.id || cj?.data?.id || cj?.transfers?.[0]?.id;
    if (!transferId) return Response.json({ error: cj?.message || 'Premiumize did not return a transfer id' }, { status: 502 });

    // Poll the transfer list until the transfer finishes and exposes a folder_id.
    let transfer = null;
    for (let i = 0; i < 14; i++) {
      const lr = await fetch(`${PREMIUMIZE_API}/transfer/list?apikey=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0' } });
      const lj = await lr.json().catch(() => ({}));
      const arr = lj?.transfers || lj?.content?.transfers || [];
      transfer = arr.find(t => String(t.id) === String(transferId)) || null;
      if (transfer && (transfer.status === 'finished' || (transfer.progress ?? 0) >= 100)) break;
      await sleep(1500);
    }
    if (!transfer) return Response.json({ error: 'Transfer did not complete in time' }, { status: 502 });
    const folderId = transfer.folder_id || transfer.folderid;
    if (!folderId) return Response.json({ error: 'No folder returned for the finished transfer' }, { status: 502 });

    // List the transfer's folder and pick the largest file.
    const fr = await fetch(`${PREMIUMIZE_API}/folder/list?id=${encodeURIComponent(folderId)}&apikey=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0' } });
    const fj = await fr.json().catch(() => ({}));
    const content = fj?.content || fj?.data?.content || [];
    const files = content.filter(c => (c.type === 'file' || c.link || c.url) && c.name);
    if (!files.length) return Response.json({ error: 'No files in the finished transfer' }, { status: 502 });
    const sorted = [...files].sort((a, b) => parseInt(b.size || 0, 10) - parseInt(a.size || 0, 10));
    const f = sorted[0];
    const cdnUrl = f.link || f.url;
    if (!cdnUrl) return Response.json({ error: 'No stream link available for the largest file' }, { status: 502 });

    return Response.json({
      name: f.name || transfer.name,
      cdnUrl,
      sizeBytes: parseInt(f.size || 0, 10),
      sizeLabel: formatSize(parseInt(f.size || 0, 10)),
      fileCount: files.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}