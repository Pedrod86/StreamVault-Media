import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Activity, Gauge, Play, ShieldAlert, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Map a downlink speed (Mbps) to a streaming-quality verdict + colour.
function qualityFor(mbps) {
  if (mbps >= 25) return { label: '4K / UHD', sub: 'High quality', color: 'text-sky-400', bar: 'bg-sky-500' };
  if (mbps >= 15) return { label: '1080p', sub: 'High', color: 'text-green-400', bar: 'bg-green-500' };
  if (mbps >= 5) return { label: '720p', sub: 'Medium', color: 'text-yellow-400', bar: 'bg-yellow-500' };
  if (mbps >= 1.5) return { label: '480p', sub: 'Low', color: 'text-orange-400', bar: 'bg-orange-500' };
  return { label: 'SD / low', sub: 'Very low', color: 'text-destructive', bar: 'bg-destructive' };
}

const GAUGE_MAX = 50; // Mbps ceiling for the bar

export default function VpnBandwidthWidget() {
  const { data: servers = [] } = useQuery({
    queryKey: ['vpnServers'],
    queryFn: () => base44.entities.VpnServer.list('-created_date'),
    staleTime: 30 * 1000,
  });
  const active = servers.find(s => s.is_active) || null;

  // Live estimate from the Network Information API (where available)
  const [liveDown, setLiveDown] = useState(null); // Mbps
  const [effType, setEffType] = useState(null);
  const [rtt, setRtt] = useState(null);

  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return;
    const update = () => {
      if (typeof conn.downlink === 'number') setLiveDown(conn.downlink);
      if (typeof conn.effectiveType === 'string') setEffType(conn.effectiveType);
      if (typeof conn.rtt === 'number') setRtt(conn.rtt);
    };
    update();
    conn.addEventListener?.('change', update);
    return () => conn.removeEventListener?.('change', update);
  }, []);

  // On-demand speed test
  const [testing, setTesting] = useState(false);
  const [measured, setMeasured] = useState(null); // Mbps
  const [testErr, setTestErr] = useState('');

  const runTest = async () => {
    setTesting(true);
    setTestErr('');
    try {
      const bytes = 5_000_000; // ~5 MB download probe
      const url = `https://speed.cloudflare.com/__down?bytes=${bytes}&t=${Date.now()}`;
      const start = performance.now();
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const seconds = (performance.now() - start) / 1000;
      if (!buf.byteLength) throw new Error('empty response');
      const mbps = (buf.byteLength * 8) / seconds / 1_000_000;
      setMeasured(mbps);
    } catch (e) {
      setTestErr('Speed test unavailable on this network.');
    } finally {
      setTesting(false);
    }
  };

  // The number we surface: prefer a fresh test result, fall back to live estimate
  const mbps = measured ?? liveDown;
  const q = mbps != null ? qualityFor(mbps) : null;
  const kind = active?.vpn_type === 'openvpn' ? 'OpenVPN' : 'WireGuard';

  if (!active) {
    return (
      <div className="mx-4 sm:mx-6 mb-4 rounded-xl border border-border bg-card p-4 flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">VPN bandwidth</p>
          <p className="text-xs text-muted-foreground">Connect a VPN server in Settings to see throughput while streaming.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 sm:mx-6 mb-4 rounded-xl border border-green-500/30 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-400" />
          <h3 className="font-heading font-semibold text-sm text-foreground">VPN bandwidth</h3>
          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">{kind}</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs gap-1.5 border-green-500/40 text-green-400 hover:bg-green-500/10"
          onClick={runTest}
          disabled={testing}
        >
          {testing ? <><span className="h-3 w-3 rounded-full border-2 border-green-400/40 border-t-green-400 animate-spin" /> Testing…</> : <><Play className="w-3.5 h-3.5" /> Run speed test</>}
        </Button>
      </div>

      {/* Throughput gauge */}
      <div className="flex items-end gap-3">
        <div className="flex items-center gap-1.5">
          <Gauge className="w-7 h-7 text-primary" />
          <span className="text-2xl font-bold text-foreground tabular-nums">
            {mbps != null ? mbps.toFixed(1) : '—'}
          </span>
          <span className="text-xs text-muted-foreground mb-1">Mbps</span>
        </div>
        {q && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary ${q.color}`}>
            {q.label} · {q.sub}
          </span>
        )}
      </div>

      {/* Gauge bar */}
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${q?.bar || 'bg-primary'}`}
          style={{ width: `${Math.min(100, ((mbps || 0) / GAUGE_MAX) * 100)}%` }}
        />
      </div>

      {/* Sub-readings */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {effType && <span>Network: <span className="text-foreground font-medium">{effType}</span></span>}
        {rtt != null && <span>Latency: <span className="text-foreground font-medium">{rtt} ms</span></span>}
        {measured != null && <span className="text-green-400">Measured</span>}
        {measured == null && liveDown != null && <span>Estimated (live)</span>}
      </div>

      {testErr && <p className="text-xs text-destructive flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> {testErr}</p>}
      <p className="text-[11px] text-muted-foreground leading-snug">
        Reflects the device's current connection (includes VPN when your tunnel routes all traffic). Use it as a guide to whether streams run at low or high quality.
      </p>
    </div>
  );
}