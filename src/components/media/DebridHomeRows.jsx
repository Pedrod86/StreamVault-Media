import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Cloud, Film, Tv, Play, Loader2, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import TorBoxPlayer from '@/components/media/TorBoxPlayer';

export default function DebridHomeRows() {
  const { data: servers = [] } = useQuery({
    queryKey: ['mediaServers'],
    queryFn: () => base44.entities.MediaServer.list(),
    staleTime: 60 * 1000,
  });
  const torboxServer = servers.find(s => s.server_type === 'torbox' && s.is_active !== false);

  const { data, isLoading } = useQuery({
    queryKey: ['torboxLibrary', torboxServer?.id, 'home'],
    queryFn: async () => {
      const res = await base44.functions.invoke('torboxLibrary', { serverId: torboxServer?.id });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    enabled: !!torboxServer,
    staleTime: 5 * 60 * 1000,
  });

  const [playing, setPlaying] = useState(null);

  if (!torboxServer) {
    // Show a connect prompt only when no debrid is connected at all.
    return (
      <div className="mx-4 sm:mx-6 mt-6 p-4 rounded-xl border border-border bg-card flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shrink-0">
          <Cloud className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-heading font-semibold text-foreground">Cloud Debrid</p>
          <p className="text-xs text-muted-foreground">Connect TorBox to stream your cached downloads here.</p>
        </div>
        <Link to="/connect-server" className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline shrink-0">
          <LinkIcon className="w-3.5 h-3.5" /> Connect
        </Link>
      </div>
    );
  }

  const items = (data?.items || []).slice(0, 20);
  if (!isLoading && !items.length) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between px-4 sm:px-6 mb-3">
        <h2 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
          <Cloud className="w-4 h-4 text-sky-400" />
          TorBox Downloads
        </h2>
        <Link to="/torbox" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
      </div>

      {isLoading ? (
        <div className="flex gap-3 px-4 sm:px-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[160px] h-[92px] rounded-xl bg-secondary animate-pulse shrink-0" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto px-4 sm:px-6 pb-2" style={{ scrollbarWidth: 'none' }}>
          {items.map(t => (
            <div
              key={t.id}
              className="group shrink-0 w-[180px] p-3 rounded-xl border border-border bg-card hover:border-sky-500/40 transition-colors flex flex-col gap-2"
            >
              <div className="flex items-start gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0">
                  {t.mediaType === 'tv_show'
                    ? <Tv className="w-4 h-4 text-sky-400" />
                    : <Film className="w-4 h-4 text-sky-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{t.title}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {t.state === 'cached' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-medium">Cached</span>
                    )}
                    {t.sizeLabel && <span className="text-[10px] text-muted-foreground">{t.sizeLabel}</span>}
                    {t.fileCount > 1 && <span className="text-[10px] text-muted-foreground">· {t.fileCount} files</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPlaying(t)}
                disabled={!t.streamUrl}
                className="mt-auto flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Play
              </button>
            </div>
          ))}
        </div>
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