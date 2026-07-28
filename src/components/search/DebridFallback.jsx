import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CloudDownload, Play, Lock, Magnet, Plus } from 'lucide-react';
import TorBoxPlayer from '@/components/media/TorBoxPlayer';

// Debrid provider metadata (mirrors the connection forms' colour tokens).
const PROVIDERS = {
  alldebrid: {
    id: 'alldebrid', name: 'AllDebrid',
    color: 'from-violet-500 to-purple-700', ring: 'border-violet-500/40 text-violet-300', dot: 'bg-violet-500',
  },
  torbox: {
    id: 'torbox', name: 'TorBox',
    color: 'from-orange-500 to-amber-600', ring: 'border-orange-500/40 text-orange-300', dot: 'bg-orange-500',
  },
  premiumize: {
    id: 'premiumize', name: 'Premiumize',
    color: 'from-cyan-500 to-sky-600', ring: 'border-cyan-500/40 text-cyan-300', dot: 'bg-cyan-500',
  },
};
const DEBRID_TYPES = ['alldebrid', 'torbox', 'premiumize'];
const SCRAPE_FN = { alldebrid: 'alldebridScrape', torbox: 'torboxScrape', premiumize: 'premiumizeScrape' };
const UNLOCK_FN = { alldebrid: 'alldebridUnlock', torbox: 'torboxUnlock', premiumize: 'premiumizeUnlock' };
const PROVIDER_ORDER = ['alldebrid', 'torbox', 'premiumize'];

function qualityClass(q) {
  switch (q) {
    case '4K': return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case '1080p': return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    case '720p': return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    default: return 'bg-secondary text-muted-foreground border-border';
  }
}

export default function DebridFallback({ query, auto = false }) {
  const [enabled, setEnabled] = useState(!!auto);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [quality, setQuality] = useState('any');
  const [streaming, setStreaming] = useState(null);

  const { data: servers = [] } = useQuery({
    queryKey: ['mediaServers'],
    queryFn: () => base44.entities.MediaServer.list(),
    staleTime: 60000,
  });

  // Connected debrid providers, in a stable order.
  const connected = PROVIDER_ORDER
    .map(type => servers.find(s => s.server_type === type && s.is_active !== false))
    .filter(Boolean);
  const activeProvider = (selectedProvider && connected.find(c => c.server_type === selectedProvider))
    ? selectedProvider
    : connected[0]?.server_type;
  const activeServer = connected.find(c => c.server_type === activeProvider);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['debridScrape', activeProvider, activeServer?.id, query, enabled, quality],
    queryFn: async () => {
      const res = await base44.functions.invoke(SCRAPE_FN[activeProvider], { query, quality, limit: 25, serverId: activeServer.id });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    enabled: !!query && !!activeServer && enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const items = data?.items || [];
  const bestMagnet = data?.bestMagnet;

  // Auto-unlock the best cached candidate for instant play.
  const { data: bestStream, isLoading: unlockingBest } = useQuery({
    queryKey: ['debridUnlock', activeProvider, bestMagnet, activeServer?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke(UNLOCK_FN[activeProvider], { magnet: bestMagnet });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    enabled: !!bestMagnet && !!activeServer && enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const unlockMutation = useMutation({
    mutationFn: async ({ magnet, title }) => {
      const res = await base44.functions.invoke(UNLOCK_FN[activeProvider], { magnet });
      if (res.data?.error) throw new Error(res.data.error);
      return { data: res.data, title };
    },
    onSuccess: ({ data: stream, title }) => {
      setStreaming({
        title: stream.name || title || 'Debrid stream',
        files: [{ id: 'debrid', name: stream.name || title || 'Debrid stream', streamUrl: stream.cdnUrl, sizeLabel: stream.sizeLabel }],
        streamUrl: stream.cdnUrl,
      });
    },
  });

  // No debrid provider connected — prompt the user to connect one.
  if (!connected.length) {
    return (
      <div className="mt-6 p-5 rounded-xl border border-primary/30 bg-primary/10">
        <div className="flex items-center gap-3 mb-4">
          <CloudDownload className="w-9 h-9 text-primary shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-foreground">No results? Let a debrid find it</p>
            <p className="text-sm text-muted-foreground">Connect AllDebrid, TorBox, or Premiumize to scrape & stream torrents when your servers don't have a title.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {PROVIDER_ORDER.map(type => (
            <Badge key={type} variant="outline" className={`gap-1.5 px-2.5 py-1 ${PROVIDERS[type].ring}`}>
              <span className={`w-2 h-2 rounded-full ${PROVIDERS[type].dot}`} />
              {PROVIDERS[type].name}
            </Badge>
          ))}
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-lg mt-4 gap-1.5">
          <Link to="/connect-server"><Plus className="w-4 h-4" /> Connect a debrid</Link>
        </Button>
      </div>
    );
  }

  // Not yet searching (manual mode) — offer the one-tap search button.
  if (!enabled && !auto) {
    const prov = PROVIDERS[activeProvider];
    return (
      <div className="mt-8 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${prov.color} flex items-center justify-center shadow-lg shrink-0`}>
          <CloudDownload className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-heading font-semibold text-foreground">Find on {prov.name}</p>
          <p className="text-xs text-muted-foreground">Not on your servers? Scrape & stream the best cached torrent.</p>
        </div>
        <Button variant="outline" size="sm" className={`rounded-lg ${prov.ring}`} onClick={() => { setEnabled(true); refetch(); }} disabled={isFetching}>
          {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
          Search via {prov.name}
        </Button>
      </div>
    );
  }

  const prov = PROVIDERS[activeProvider];

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${prov.color} flex items-center justify-center shadow-lg shrink-0`}>
          <CloudDownload className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-[180px]">
          <h2 className="font-heading font-semibold text-foreground flex items-center gap-2 flex-wrap">
            Find via {prov.name}
            <Badge variant="outline" className={prov.ring}>Debrid</Badge>
          </h2>
          <p className="text-xs text-muted-foreground truncate">
            {activeServer.server_name} · {data ? `${data.cachedMatches} cached · ${items.length} scraped` : 'scraping torrents & checking cache'}
          </p>
        </div>

        {/* Provider picker — only when more than one debrid is connected. */}
        {connected.length > 1 && (
          <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary border border-border">
            {connected.map(c => {
              const p = PROVIDERS[c.server_type];
              const active = c.server_type === activeProvider;
              return (
                <button
                  key={c.server_type}
                  onClick={() => setSelectedProvider(c.server_type)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    active ? `bg-card text-foreground border ${p.ring}` : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${p.dot}`} />
                  {p.name}
                </button>
              );
            })}
          </div>
        )}

        <select
          value={quality}
          onChange={(e) => { setQuality(e.target.value); refetch(); }}
          className="bg-secondary border border-border rounded-lg text-sm px-2.5 py-1.5 text-foreground"
        >
          <option value="any">Any</option>
          <option value="4k">4K</option>
          <option value="1080p">1080p</option>
          <option value="720p">720p</option>
        </select>
      </div>

      {(isLoading || isFetching) && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      )}

      {error && !isFetching && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
          <div className="flex-1">
            <p className="font-semibold mb-0.5">Couldn't search via {prov.name}</p>
            <p className="opacity-90">{error.message}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {!isFetching && !items.length && enabled && (
        <p className="text-sm text-muted-foreground">No debrid matches found. Try a different provider, title, year, or quality.</p>
      )}

      {!isFetching && items.length > 0 && (
        <div className="space-y-2">
          {items.map((it, idx) => {
            const isBest = bestMagnet && it.magnet === bestMagnet;
            const stream = isBest ? bestStream : null;
            const unlockingNow = isBest && unlockingBest;
            return (
              <div key={(it.hash || it.title) + idx} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60 border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate" title={it.title}>{it.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{it.source} · {it.seeders} seeders · {it.sizeLabel || '—'}</p>
                </div>
                <Badge variant="outline" className={qualityClass(it.quality)}>{it.quality}</Badge>
                {it.cached ? (
                  <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 gap-1"><Lock className="w-3 h-3" /> Cached</Badge>
                ) : (
                  <Badge variant="outline" className="bg-secondary text-muted-foreground">Uncached</Badge>
                )}
                {it.cached ? (
                  <Button
                    size="sm"
                    className={`rounded-lg border-0 gap-1.5 bg-gradient-to-r ${prov.color} text-white`}
                    disabled={unlockingNow || unlockMutation.isPending}
                    onClick={() => {
                      if (isBest && stream) {
                        setStreaming({
                          title: stream.name || it.title,
                          files: [{ id: it.hash, name: stream.name || it.title, streamUrl: stream.cdnUrl, sizeLabel: stream.sizeLabel }],
                          streamUrl: stream.cdnUrl,
                        });
                      } else {
                        unlockMutation.mutate({ magnet: it.magnet, title: it.title });
                      }
                    }}
                  >
                    {unlockingNow || unlockMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Play
                  </Button>
                ) : (
                  <a href={it.magnet} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" title="Open magnet">
                    <Magnet className="w-4 h-4" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {streaming && (
        <TorBoxPlayer
          title={streaming.title}
          files={streaming.files}
          streamUrl={streaming.streamUrl}
          onClose={() => setStreaming(null)}
        />
      )}
    </div>
  );
}