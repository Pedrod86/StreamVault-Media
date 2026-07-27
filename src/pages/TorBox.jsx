import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RefreshCw, Film, Tv, Play, Cloud, Loader2, Database, ArrowLeft, Link as LinkIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import TorBoxPlayer from '@/components/media/TorBoxPlayer';

export default function TorBox() {
  const queryClient = useQueryClient();
  const [playing, setPlaying] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const { data: servers = [] } = useQuery({
    queryKey: ['mediaServers'],
    queryFn: () => base44.entities.MediaServer.list('-created_date'),
  });
  const torboxServer = servers.find(s => s.server_type === 'torbox' && s.is_active !== false);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['torboxLibrary', torboxServer?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('torboxLibrary', {
        serverId: torboxServer?.id,
        bypass_cache: true,
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    enabled: !!torboxServer,
  });

  const items = data?.items || [];

  const syncToLibrary = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const existing = await base44.entities.Media.filter({ tags: 'torbox' }, '-created_date', 2000);
      const seen = new Set(existing.map(m => m.title?.toLowerCase().trim()));
      const fresh = items.filter(t => t.streamUrl && !seen.has(t.title.toLowerCase()));
      if (!fresh.length) {
        setSyncMsg('Already up to date — nothing new to sync.');
      } else {
        const BATCH = 50;
        let created = 0;
        for (let i = 0; i < fresh.length; i += BATCH) {
          await base44.entities.Media.bulkCreate(
            fresh.slice(i, i + BATCH).map(t => ({
              title: t.title,
              media_type: t.mediaType,
              video_url: t.streamUrl,
              description: `Synced from TorBox${t.sizeLabel ? ` · ${t.sizeLabel}` : ''}`,
              tags: ['torbox', `torbox:${t.torrentId}`],
            }))
          );
          created += Math.min(BATCH, fresh.length - i);
        }
        setSyncMsg(`${created} item${created === 1 ? '' : 's'} added to your library.`);
        queryClient.invalidateQueries({ queryKey: ['media'] });
      }
    } catch (e) {
      setSyncMsg(`Sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-20">
      <div className="flex items-center gap-3 mb-1">
        <Button variant="ghost" size="icon" asChild className="h-9 w-9 text-muted-foreground">
          <Link to="/connect-server"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-lg">
          <Cloud className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-bold text-2xl text-foreground">TorBox</h1>
          <p className="text-muted-foreground text-xs truncate">
            {torboxServer ? (torboxServer.server_name || 'Connected') : 'Not connected'}
          </p>
        </div>
        {torboxServer && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        )}
      </div>

      {!torboxServer ? (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <Cloud className="w-10 h-10 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Connect your TorBox account to sync your cached downloads.</p>
          <Button asChild className="gap-2"><Link to="/connect-server"><LinkIcon className="w-4 h-4" /> Add TorBox</Link></Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mt-5 mb-3">
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Loading…' : `${items.length} completed item${items.length === 1 ? '' : 's'} ready`}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs border-sky-500/40 text-sky-400 hover:bg-sky-500/10"
              onClick={syncToLibrary}
              disabled={syncing || !items.length}
            >
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />} Sync to Library
            </Button>
          </div>

          {syncMsg && <p className="text-xs text-green-400 mb-3">{syncMsg}</p>}

          {error && (
            <p className="text-xs text-destructive mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              {error.message}
            </p>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl bg-secondary" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <Cloud className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No completed torrents yet.</p>
              <p className="text-muted-foreground text-xs mt-1">Add torrents in your TorBox dashboard, then tap Refresh.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(t => (
                <div key={t.id} className="group p-4 rounded-xl border border-border bg-card flex flex-col gap-3 hover:border-sky-500/40 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0">
                      {t.mediaType === 'tv_show' ? <Tv className="w-4 h-4 text-sky-400" /> : <Film className="w-4 h-4 text-sky-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{t.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {t.state === 'cached' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-medium">Cached</span>
                        )}
                        {t.sizeLabel && <span className="text-[10px] text-muted-foreground">{t.sizeLabel}</span>}
                        {t.fileCount > 1 && <span className="text-[10px] text-muted-foreground">· {t.fileCount} files</span>}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" className="gap-1.5 w-full" onClick={() => setPlaying(t)} disabled={!t.streamUrl}>
                    <Play className="w-3.5 h-3.5 fill-current" /> Play
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {playing && (
        <TorBoxPlayer
          title={playing.title}
          files={playing.files}
          streamUrl={playing.streamUrl}
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  );
}