import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Video stream proxy — pipes binary stream data to the browser.
 * Usage: POST { url: "http://xtream-server/live/user/pass/id.m3u8" }
 * Returns the raw stream with proper content-type headers.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const body = await req.json();
    const { url } = body;
    if (!url) return new Response('Missing url', { status: 400 });

    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StreamVault/1.0)',
        'Accept': '*/*',
      },
    });

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

    // If this is an m3u8 playlist, we need to rewrite segment URLs to go through this proxy
    if (contentType.includes('mpegurl') || url.includes('.m3u8')) {
      const text = await upstream.text();
      // Return the playlist as-is — the client HLS player handles segment fetching
      // but segments will also fail CORS. Return base info for client to decide.
      return new Response(JSON.stringify({ type: 'm3u8', content: text, originalUrl: url }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
});