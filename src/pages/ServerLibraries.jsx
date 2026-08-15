import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Library, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmbyLibraryViews from '@/components/media/EmbyLibraryViews';
import PlexLibraryViews from '@/components/media/PlexLibraryViews';
import JellyfinLibraryViews from '@/components/media/JellyfinLibraryViews';

const LABELS = { emby: 'Emby', plex: 'Plex', jellyfin: 'Jellyfin' };

export default function ServerLibraries() {
  const [active, setActive] = useState(null);

  const { data: servers = [], isLoading } = useQuery({
    queryKey: ['mediaServers'],
    queryFn: () => base44.entities.MediaServer.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const available = servers.filter(
    s => ['emby', 'plex', 'jellyfin'].includes(s.server_type) && s.is_active !== false
  );

  useEffect(() => {
    if (!active && available.length) setActive(available[0].id);
  }, [available, active]);

  const current = available.find(s => s.id === active);

  return (
    <div className="pt-16 pb-24">
      <div className="px-4 sm:px-6 pt-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Library className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg text-foreground">Server Libraries</h1>
            <p className="text-xs text-muted-foreground">Browse the libraries on your connected servers</p>
          </div>
        </div>

        {available.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {available.map(s => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  active === s.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.server_name || LABELS[s.server_type]}
                <span className="ml-1.5 opacity-60">{LABELS[s.server_type]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!isLoading && available.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <Server className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-heading font-bold text-xl text-foreground">No servers connected</h2>
          <p className="text-sm text-muted-foreground max-w-sm">Connect Plex, Emby or Jellyfin to browse its libraries here.</p>
          <Button asChild className="rounded-xl"><Link to="/connect-server">Connect a server</Link></Button>
        </div>
      )}

      {current?.server_type === 'emby' && <EmbyLibraryViews serverId={current.id} />}
      {current?.server_type === 'plex' && <PlexLibraryViews />}
      {current?.server_type === 'jellyfin' && <JellyfinLibraryViews />}
    </div>
  );
}