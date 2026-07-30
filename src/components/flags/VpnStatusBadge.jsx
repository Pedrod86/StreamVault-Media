import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Shield, ShieldAlert } from 'lucide-react';

// Small live indicator shown on the home page: green "Protected" when an
// active VPN server is selected, or a muted "No VPN" prompt linking to Settings.
export default function VpnStatusBadge() {
  const { data: servers = [] } = useQuery({
    queryKey: ['vpnServers'],
    queryFn: () => base44.entities.VpnServer.list('-created_date'),
    staleTime: 30 * 1000,
  });

  const active = servers.find(s => s.is_active) || null;

  if (active) {
    const kind = active.vpn_type === 'openvpn' ? 'OpenVPN' : 'WireGuard';
    return (
      <Link
        to="/settings"
        className="inline-flex items-center gap-2 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/20"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
        </span>
        <Shield className="h-3.5 w-3.5" />
        <span className="truncate max-w-[180px]">{active.provider_name} · {kind}</span>
      </Link>
    );
  }

  return (
    <Link
      to="/settings"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <ShieldAlert className="h-3.5 w-3.5" />
      No VPN active — tap to connect
    </Link>
  );
}