import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Film, Tv, Sparkles, Wifi, Loader2, RefreshCw, Server } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

// Green Emby brand logo (inline SVG wordmark) — keeps the app offline-friendly.
function EmbyLogo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
        <Server className="w-4 h-4 text-white" />
      </div>
      <span className="font-heading font-extrabold text-base tracking-tight text-green-400">Emby</span>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-lg bg-black/25 border border-white/5 px-2 py-1.5 flex items-center gap-2">
      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${accent}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <p className="font-heading font-bold text-sm leading-none text-foreground">
          {value === null ? <Loader2 className="w-3.5 h-3.5 animate-spin text-green-400/70" /> : value}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

export default function EmbyStatsBox({ serverId }) {
  const [latency, setLatency] = useState(null);
  const [online, setOnline] = useState(null);

  const { data: servers = [] } = useQuery({
    queryKey: ['mediaServers'],
    queryFn: () => base44.entities.MediaServer.list(),
    staleTime: 60 * 1000,
  });
  const server = servers.find(s => s.id === serverId || (s.server_type === 'emby' && s.is_active !== false));

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['embyCategoryCounts', server?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('embyCategoryCounts', { serverId: server?.id });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    enabled: !!server,
    staleTime: 5 * 60 * 1000,
  });

  const ping = async () => {
    if (!server) return;
    setLatency(null);
    setOnline(null);
    const base = (server.server_url || '').trim().replace(/\/$/, '');
    const token = server.api_token || '';
    if (!base) { setOnline(false); return; }
    try {
      const t0 = Date.now();
      const res = await fetch(`${base}/System/Info/Public`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLatency(Date.now() - t0);
      setOnline(true);
    } catch {
      // try local url fallback
      const local = (server.local_url || '').trim().replace(/\/$/, '');
      if (local) {
        try {
          const t0 = Date.now();
          const res = await fetch(`${local}/System/Info/Public`, { signal: AbortSignal.timeout(6000) });
          if (res.ok) { setLatency(Date.now() - t0); setOnline(true); return; }
        } catch (_) {}
      }
      setOnline(false);
    }
  };

  useEffect(() => { ping(); /* eslint-disable-next-line */ }, [server?.id]);

  const fmt = (n) => (n == null ? null : n.toLocaleString());

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="mx-auto"
    >
      <motion.div
        initial={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/15 via-emerald-600/10 to-green-500/5 p-3.5 shadow-lg shadow-emerald-500/10"
      >
        {/* Animated green glow sweep */}
        <motion.div
          aria-hidden
          initial={{ x: '-120%' }}
          animate={{ x: '120%' }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent blur-2xl"
        />

        {/* Header */}
        <div className="relative flex items-center justify-between gap-3 mb-2.5">
          <EmbyLogo />
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${
              online === true ? 'bg-green-500/20 text-green-400' :
              online === false ? 'bg-destructive/20 text-destructive' :
              'bg-muted text-muted-foreground'
            }`}>
              {online === true ? <Wifi className="w-3 h-3" /> :
               online === false ? <Wifi className="w-3 h-3 opacity-50" /> :
               <Loader2 className="w-3 h-3 animate-spin" />}
              {online === true ? (latency != null ? `Online · ${latency}ms` : 'Online') :
               online === false ? 'Offline' : 'Checking'}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-400/70 hover:text-green-400 hover:bg-green-500/10"
              onClick={() => { refetch(); ping(); }}
              disabled={isFetching}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Server name */}
        <p className="relative text-[11px] text-muted-foreground mb-2 truncate">
          {server?.server_name || 'Emby Server'}
        </p>

        {/* Stats grid */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatTile icon={Film} label="Movies" value={fmt(data?.movies)} accent="bg-green-500/20 text-green-400" />
          <StatTile icon={Tv} label="TV Shows" value={fmt(data?.shows)} accent="bg-emerald-500/20 text-emerald-400" />
          <StatTile icon={Sparkles} label="4K Titles" value={fmt((data?.fourkMovies ?? 0) + (data?.fourkShows ?? 0))} accent="bg-lime-500/20 text-lime-400" />
          <StatTile icon={Server} label="Total" value={fmt(data?.total)} accent="bg-teal-500/20 text-teal-400" />
        </div>
      </motion.div>
    </motion.section>
  );
}