import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getDiscordWebhookUrl } from '../../shared/discordWebhook.ts';

// Posts a "Now Watching" / "Stopped Watching" embed to the configured Discord webhook.
// Body: { action: 'start' | 'stop', title, media_type?, year?, poster_url?, subtitle? }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, title, media_type, year, poster_url, subtitle } = body || {};
    if (!title) return Response.json({ ok: true });

    const webhookUrl = await getDiscordWebhookUrl(base44);
    if (!webhookUrl) return Response.json({ ok: true, skipped: 'no webhook configured' });

    const who = user.full_name || user.email || 'Someone';
    const stopping = action === 'stop';
    const typeEmoji = media_type === 'movie' ? '🎬' : '📺';

    const embed: Record<string, unknown> = {
      author: { name: `${who} ${stopping ? 'stopped watching' : 'is watching'}` },
      title: `${typeEmoji} ${title}${year ? ` (${year})` : ''}`,
      description: subtitle || undefined,
      color: stopping ? 0x4f545c : 0x5865f2,
      timestamp: new Date().toISOString(),
      footer: { text: 'StreamVault · Now Watching' },
    };
    if (poster_url) embed.thumbnail = { url: poster_url };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});