import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CloudDownload, Play, Lock, Magnet, Link as LinkIcon } from 'lucide-react';
import TorBoxPlayer from '@/components/media/TorBoxPlayer';

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
  const [quality, setQuality] = useState('any');
  const [streaming, setStreaming] = useState(null);

  const { data: servers = [] } = useQuery({
    queryKey: ['mediaServers'],
    queryFn: () => base44.entities.MediaServer.list(),
    staleTime: 60000,
  });
  const allDebrid = servers.find(s => s.server_type === 'alldebrid' && s.is_active !== false);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['alldebridScrape', query, enabled, quality, allDebrid?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('alldebridScrape', { query, quality, limit: 25 });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    enabled: !!query && !!allDebrid && enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const items = data?.items || [];
  const bestMagnet = data?.bestMagnet;

  // Auto-unlock the best cached candidate for instant play.
  const { data: bestStream, isLoading: unlockingBest } = useQuery({
    queryKey: ['alldebridUnlock', bestMagnet, allDebrid?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('alldebridUnlock', { magnet: bestMagnet });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    enabled: !!bestMagnet && !!allDebrid && enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // On-demand unlock for any cached candidate the user taps.
  const unlockMutation = useMutation({
    mutationFn: async (magnet) => {
      const res = await base44.functions.invoke('alldebridUnlock', { magnet });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (stream, magnet) => {
      setStreaming({
        title: stream.name || 'AllDebrid stream',
        files: [{ id: magnet, name: stream.name || 'AllDebrid stream', streamUrl: stream.cdnUrl, sizeLabel: stream.sizeLabel }],
        streamUrl: stream.cdnUrl,
      });
    },
  });

  if (!allDebrid) {
    return (
      <div className="mt-6 p-5 rounded-xl border border-violet-500/30 bg-violet-500/10 flex flex-wrap items-center gap-4">
        <CloudDownload className="w-9 h-9 text-violet-400 shrink-0" />
        <div className="flex-1 min-w-[200px]">
          <p className="font-semibold text-foreground">No results? Let AllDebrid find it</p>
          <p className="text-sm text-muted-foreground">Connect your AllDebrid account and we'll scrape torrents and stream cached copies automatically when your servers don't have a title.</p>
        </div>
        <Button asChild variant="outline" className="border-violet-500/40 text-violet-300 rounded-lg">
          <Link to="/connect-server">Connect AllDebrid</Link>
        </Button>
      </div>
    );
  }

  if (!enabled && !auto) {
    return (
      <div className="mt-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shrink-0">
          <CloudDownload className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-heading font-semibold text-foreground">Find on AllDebrid</p>
          <p className="text-xs text-muted-foreground">Not on your servers? Scrape & stream the best cached torrent.</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-lg border-violet-500/40 text-violet-300" onClick={() => { setEnabled(true); refetch(); }} disabled={isFetching}>
          {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
          Search via AllDebrid
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shrink-0">
          <CloudDownload className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading font-semibold text-foreground flex items-center gap-2 flex-wrap">
            Find via AllDebrid
            <Badge variant="outline" className="border-violet-500/40 text-violet-300">Debrid</Badge>
          </h2>
          <p className="text-xs text-muted-foreground truncate">{allDebrid.server_name} · {data ? `${data.cachedMatches} cached · ${items.length} scraped` : 'scraping torrents & checking cache'}</p>
        </div>
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
            <p className="font-semibold mb-0.5">Couldn't search via AllDebrid</p>
            <p className="opacity-90">{error.message}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {!isFetching && !items.length && enabled && (
        <p className="text-sm text-muted-foreground">No debrid matches found. Try a different title, year, or quality.</p>
      )}

      {!isFetching && items.length > 0 && (
        <div className="space-y-2">
          {items.map((it, idx) => {
            const isBest = bestMagnet && it.magnet === bestMagnet;
            const stream = isBest ? bestStream : null;
            const unlockingNow = isBest && unlockingBest;
            const unlockingOther = unlockMutation.isPending && unlockMutation.variables === it.magnet;
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
                    className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-700 border-0 gap-1.5"
                    disabled={unlockingNow || unlockingOther}
                    onClick={() => {
                      if (isBest && stream) {
                        setStreaming({
                          title: stream.name || it.title,
                          files: [{ id: it.hash, name: stream.name || it.title, streamUrl: stream.cdnUrl, sizeLabel: stream.sizeLabel }],
                          streamUrl: stream.cdnUrl,
                        });
                      } else {
                        unlockMutation.mutate(it.magnet);
                      }
                    }}
                  >
                    {(unlockingNow || unlockingOther) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
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