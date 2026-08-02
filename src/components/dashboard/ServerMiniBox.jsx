import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Loader2, Server, Cloud } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const STYLES = {
  emby:     { label: 'Emby',     text: 'text-green-400',  chip: 'from-green-400 to-emerald-600', border: 'border-green-500/30',  bg: 'from-green-500/15 via-emerald-600/10 to-green-500/5', icon: Server, path: '/System/Info/Public' },
  plex:     { label: 'Plex',     text: 'text-yellow-400', chip: 'from-yellow-400 to-amber-600', border: 'border-yellow-500/30', bg: 'from-yellow-500/15 via-amber-600/10 to-yellow-500/5', icon: Server, path: '/identity' },
  jellyfin: { label: 'Jellyfin', text: 'text-purple-400', chip: 'from-purple-400 to-fuchsia-600', border: 'border-purple-500/30', bg: 'from-purple-500/15 via-fuchsia-600/10 to-purple-500/5', icon: Server, path: '/System/Info/Public' },
  torbox:   { label: 'TorBox',   text: 'text-sky-400',    chip: 'from-sky-400 to-blue-600',    border: 'border-sky-500/30',    bg: 'from-sky-500/15 via-blue-600/10 to-sky-500/5',       icon: Cloud,  path: null },
};

export default function ServerMiniBox({ server }) {
  const s = STYLES[server.server_type];
  const [online, setOnline] = useState(null);
  const Icon = s?.icon || Server;

  // TorBox has no public ping endpoint — its library call doubles as the check.
  const { data: torbox } = useQuery({
    queryKey: ['torboxLibrary', server.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('torboxLibrary', { serverId: server.id });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    enabled: server.server_type === 'torbox',
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (!s?.path) return;
    let cancelled = false;
    let base = (server.server_url || '').trim();
    if (base && !/^https?:\/\//i.test(base)) base = 'http://' + base;
    base = base.replace(/\/$/, '');
    if (!base) { setOnline(false); return; }

    const token = server.plex_token || server.api_token || '';
    const url = server.server_type === 'plex'
      ? `${base}/identity?X-Plex-Token=${encodeURIComponent(token)}`
      : `${base}${s.path}`;

    // Ping via the backend proxy — a direct browser fetch is blocked by CORS
    // (and mixed content) on Plex/Jellyfin, falsely reporting them offline.
    base44.functions.invoke('mediaProxy', { url })
      .then(res => { if (!cancelled) setOnline(!!res.data?.ok); })
      .catch(() => { if (!cancelled) setOnline(false); });
    return () => { cancelled = true; };
  }, [server.id]);

  if (!s) return null;

  const status = server.server_type === 'torbox'
    ? (torbox ? true : torbox === undefined ? null : false)
    : online;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${s.border} bg-gradient-to-br ${s.bg} p-3.5`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.chip} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className={`font-heading font-extrabold text-base tracking-tight ${s.text}`}>{s.label}</span>
        <div className={`ml-auto flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
          status === true ? 'bg-green-500/20 text-green-400' :
          status === false ? 'bg-destructive/20 text-destructive' :
          'bg-muted text-muted-foreground'
        }`}>
          {status === null ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
          {status === true ? 'Online' : status === false ? 'Offline' : 'Checking'}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 truncate">
        {server.server_type === 'torbox' && torbox
          ? `${torbox.completed} ready · ${torbox.totalTorrents} total`
          : (server.server_name || server.server_url || s.label)}
      </p>
    </motion.div>
  );
}