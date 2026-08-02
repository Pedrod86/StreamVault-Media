import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { safeFetch, assertSafeUrl } from '../../shared/ssrfGuard.ts';

// Scrapes any public web page for playable media: direct video files
// (.mp4/.webm/.mkv), HLS/DASH manifests (.m3u8/.mpd) and embeddable iframes.
// POST { url } -> { pageTitle, streams: [{ url, kind, label }] }

const DIRECT_RE = /https?:\/\/[^\s"'<>\\]+?\.(?:m3u8|mpd|mp4|webm|mkv)(?:\?[^\s"'<>\\]*)?/gi;
const IFRAME_RE = /<iframe[^>]+src=["']([^"']+)["']/gi;
const TITLE_RE = /<title[^>]*>([^<]*)<\/title>/i;

function kindOf(url: string): string {
  if (/\.m3u8(\?|$)/i.test(url)) return 'hls';
  if (/\.mpd(\?|$)/i.test(url)) return 'dash';
  return 'file';
}

function labelOf(url: string): string {
  try {
    const u = new URL(url);
    const name = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || u.hostname);
    return `${u.hostname} — ${name}`.slice(0, 120);
  } catch {
    return url.slice(0, 120);
  }
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const target = (body.url || '').trim();
    if (!target) return Response.json({ error: 'Missing url' }, { status: 400 });

    let pageUrl: URL;
    try {
      pageUrl = assertSafeUrl(target);
    } catch (e) {
      return Response.json({ error: e.message }, { status: 400 });
    }

    // If the user pasted a media file directly, just hand it back.
    if (/\.(m3u8|mpd|mp4|webm|mkv)(\?|$)/i.test(pageUrl.pathname + pageUrl.search)) {
      const u = pageUrl.toString();
      return Response.json({
        pageTitle: labelOf(u),
        streams: [{ url: u, kind: kindOf(u), label: labelOf(u) }],
      });
    }

    let res: Response;
    try {
      res = await safeFetch(pageUrl.toString(), {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,*/*',
        },
      });
    } catch (e) {
      return Response.json({ error: `Could not reach that page: ${e.message}` }, { status: 502 });
    }
    if (!res.ok) return Response.json({ error: `Page returned ${res.status}` }, { status: 502 });

    const html = await res.text();
    const pageTitle = (html.match(TITLE_RE)?.[1] || pageUrl.hostname).trim();

    const seen = new Set<string>();
    const streams: Array<{ url: string; kind: string; label: string }> = [];

    for (const m of html.matchAll(DIRECT_RE)) {
      const u = m[0].replace(/\\\//g, '/');
      if (seen.has(u)) continue;
      seen.add(u);
      streams.push({ url: u, kind: kindOf(u), label: labelOf(u) });
    }

    for (const m of html.matchAll(IFRAME_RE)) {
      let src = m[1];
      if (src.startsWith('//')) src = pageUrl.protocol + src;
      else if (src.startsWith('/')) src = pageUrl.origin + src;
      if (!/^https?:\/\//i.test(src)) continue;
      if (seen.has(src)) continue;
      // Skip obvious non-video embeds
      if (/(doubleclick|googletagmanager|google\.com\/recaptcha|facebook\.com|disqus)/i.test(src)) continue;
      seen.add(src);
      streams.push({ url: src, kind: 'embed', label: labelOf(src) });
    }

    return Response.json({ pageTitle, streams: streams.slice(0, 40) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}