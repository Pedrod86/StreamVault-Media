import React, { useState, useEffect } from 'react';
import { Wifi, Cloud, Loader2 } from 'lucide-react';
import { resolveEmbyConnection } from '@/lib/embyConnection';

/**
 * Shows which route is active for an Emby/Jellyfin server:
 * Local (direct LAN) or Relay (remote via proxy).
 * Only meaningful when a local_url is configured.
 */
export default function ConnectionRouteBadge({ server }) {
  const [mode, setMode] = useState(null); // 'local' | 'relay' | null

  useEffect(() => {
    let active = true;
    resolveEmbyConnection(server)
      .then((conn) => { if (active) setMode(conn.mode); })
      .catch(() => { if (active) setMode('relay'); });
    return () => { active = false; };
  }, [server.id, server.local_url, server.server_url]);

  if (mode === null) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" /> Routing…
      </span>
    );
  }

  if (mode === 'local') {
    return (
      <span className="flex items-center gap-1 text-xs text-accent font-medium" title="Connected directly over your local network">
        <Wifi className="w-3 h-3" /> Local
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium" title="Connected via remote relay">
      <Cloud className="w-3 h-3" /> Relay
    </span>
  );
}