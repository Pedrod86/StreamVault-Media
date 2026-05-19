import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { url, method = 'GET', headers: reqHeaders = {}, bodyData } = body;

    if (!url) return Response.json({ error: 'Missing url parameter' }, { status: 400 });

    const fetchOptions = {
      method,
      headers: { 'Accept': 'application/json', ...reqHeaders },
    };
    if (bodyData) {
      fetchOptions.body = JSON.stringify(bodyData);
      fetchOptions.headers['Content-Type'] = 'application/json';
    }

    const redirectChain = [url];
    let currentUrl = url;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res;
    try {
      // Step 1: fetch with redirect:manual to capture the first redirect location
      res = await fetch(currentUrl, { ...fetchOptions, signal: controller.signal, redirect: 'manual' });

      if (res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308) {
        const location = res.headers.get('location');
        if (location) {
          const nextUrl = location.startsWith('http') ? location : new URL(location, currentUrl).toString();
          // Only follow if different (avoid loop)
          if (nextUrl !== currentUrl) {
            redirectChain.push(nextUrl);
            currentUrl = nextUrl;
            console.log(`[mediaProxy] Redirect: ${redirectChain[0]} → ${currentUrl}`);
          }
        }
        // Step 2: fetch the resolved URL directly, no further redirect following
        res = await fetch(currentUrl, { ...fetchOptions, signal: controller.signal, redirect: 'manual' });
        // If still redirecting (server loop), just return whatever we got
        if (res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308) {
          const location2 = res.headers.get('location');
          if (location2 && location2 !== currentUrl && !redirectChain.includes(location2)) {
            const next2 = location2.startsWith('http') ? location2 : new URL(location2, currentUrl).toString();
            redirectChain.push(next2);
            currentUrl = next2;
            res = await fetch(currentUrl, { ...fetchOptions, signal: controller.signal, redirect: 'follow' });
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return Response.json({ status: res.status, ok: res.ok, data, redirectChain: redirectChain.length > 1 ? redirectChain : undefined });
  } catch (error) {
    const msg = error.name === 'AbortError'
      ? 'Request timed out — server unreachable or too slow'
      : error.message;
    return Response.json({ status: 0, ok: false, error: msg, data: null });
  }
});