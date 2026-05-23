import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BATCH = 50;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const server = body.server;
    const items = body.items; // items must have emby_id in tags or as a field

    if (!server) return Response.json({ error: 'Missing server' }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ success: true, fetched: 0, created: 0, updated: 0 });
    }

    // Build a set of emby IDs for this batch (stored as "emby:<id>" tag)
    const embyIdToItem = new Map();
    for (const item of items) {
      if (item.emby_id) embyIdToItem.set(item.emby_id, item);
    }
    const hasEmbyIds = embyIdToItem.size > 0;

    let newItems = items;

    if (hasEmbyIds) {
      // Fast dedup: check only for emby IDs in this batch
      // Query existing records that have any of these emby IDs tagged
      const embyIds = [...embyIdToItem.keys()];
      const existingEmbyIds = new Set();

      // Query in parallel chunks of 20
      const CHUNK = 20;
      for (let i = 0; i < embyIds.length; i += CHUNK) {
        const chunk = embyIds.slice(i, i + CHUNK);
        const checks = await Promise.all(
          chunk.map(eid =>
            base44.entities.Media.filter({ tags: `emby:${eid}` }, '-created_date', 1)
              .then(r => r.length > 0 ? eid : null)
              .catch(() => null)
          )
        );
        checks.forEach(eid => { if (eid) existingEmbyIds.add(eid); });
        if (i + CHUNK < embyIds.length) await sleep(100);
      }

      newItems = items.filter(item => item.emby_id && !existingEmbyIds.has(item.emby_id));
    }

    // Bulk create
    let createdCount = 0;
    for (let i = 0; i < newItems.length; i += BATCH) {
      await base44.entities.Media.bulkCreate(newItems.slice(i, i + BATCH));
      createdCount += Math.min(BATCH, newItems.length - i);
      if (i + BATCH < newItems.length) await sleep(200);
    }

    const duration = Math.round((Date.now() - t0) / 1000);

    await base44.entities.SyncLog.create({
      server_id: server?.id || 'unknown',
      server_name: server?.server_name || 'Emby',
      server_type: 'emby',
      status: 'success',
      items_fetched: items.length,
      items_created: createdCount,
      items_updated: 0,
      duration_seconds: duration,
      started_at: startedAt,
    });

    if (createdCount > 0) {
      try {
        await base44.asServiceRole.functions.invoke('discordSyncAlert', {
          data: {
            server_name: server?.server_name || 'Emby',
            server_type: 'emby',
            status: 'success',
            items_fetched: items.length,
            items_created: createdCount,
            items_updated: 0,
            duration_seconds: duration,
          }
        });
      } catch (_) {}
    }

    return Response.json({ success: true, fetched: items.length, created: createdCount, updated: 0 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});