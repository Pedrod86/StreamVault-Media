import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, AlertCircle, Loader2, Server, Shield, ShieldOff } from 'lucide-react';

const TYPE_LABELS = { plex: 'Plex', emby: 'Emby', jellyfin: 'Jellyfin' };

export default function ConnectionStatusStrip() {
  const { data: servers = [] } = useQuery({
    queryKey: ['mediaServers'],
    queryFn: () => base44.entities.MediaServer.list(),
    staleTime: 60 * 1000,
  });
  const { data: vpnServers = [] } = useQuery({
    queryKey: ['vpnServers'],
    queryFn: () => base44.entities.VpnServer.list('-created_date'),
    staleTime: 30 * 1000,
  });

  const monitored = servers.filter(s => ['plex', 'emby', 'jellyfin'].includes(s.server_type) && s.is_active !== false);
  const activeVpn = vpnServers.find(v => v.is_active) || null;

  // Ping the first monitored media server for an aggregate online/offline read.
  const [health, setHealth] = useState('checking');
  const [serverName, setServerName] = useState('');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (monitored.length === 0) { if (!cancelled) setHealth('none'); return; }
      setHealth('checking');
      const server = monitored[0];
      if (!cancelled) setServerName(server.server_name || TYPE_LABELS[server.server_type] || 'Server');
      try {
        let base = (server.server_url || '').trim();
        if (base && !/^https?:\/\//i.test(base)) base = 'http://' + base;
        base = base.replace(/\/$/, '');
        if (!base) throw new Error('No URL');
        const token = server.api_token || server.plex_token;
        const url = server.server_type === 'plex'
          ? `${base}/identity?X-Plex-Token=${token}`
          : `${base}/System/Info/Public`;
        const res = await base44.functions.invoke('mediaProxy', { url });
        if (cancelled) return;
        if (!res.data?.ok && res.data?.status !== 'success' && !res.data?.data?.user) throw new Error('Unreachable');
        setHealth('ok');
      } catch {
        if (!cancelled) setHealth('error');
      }
    };
    check();
    const t = setInterval(check, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [monitored.map(s => s.id).join(','), monitored.length]);

  return (
    <div className="mx-4 sm:mx-6 mb-4 flex flex-wrap items-center gap-2">
      {/* Media server pill */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border">
        <Server className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground">
          {monitored.length === 0 && serverName === '' ? 'No media server' : (serverName || 'Media server')}
        </span>
        {health === 'checking' && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Checking</span>}
        {health === 'ok' && <span className="flex items-center gap-1 text-xs text-green-400 font-medium"><CheckCircle2 className="w-3 h-3" /> Online</span>}
        {health === 'error' && <span className="flex items-center gap-1 text-xs text-destructive font-medium"><AlertCircle className="w-3 h-3" /> Offline</span>}
        {health === 'none' && <span className="text-xs text-muted-foreground">—</span>}
      </div>

      {/* VPN pill */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border ${activeVpn ? 'border-green-500/30' : 'border-border'}`}>
        {activeVpn ? <Shield className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <ShieldOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
        <span className="text-xs text-muted-foreground">VPN</span>
        {activeVpn
          ? <span className="flex items-center gap-1 text-xs text-green-400 font-medium"><CheckCircle2 className="w-3 h-3" /> {activeVpn.vpn_type === 'openvpn' ? 'OpenVPN' : 'WireGuard'}</span>
          : <span className="text-xs text-muted-foreground font-medium">Inactive</span>}
      </div>
    </div>
  );
}