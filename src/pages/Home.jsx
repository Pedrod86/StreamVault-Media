import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import HomeSearchBar from '../components/media/HomeSearchBar';
import PullToRefresh from '../components/layout/PullToRefresh';
import EmbyContinueWatching from '../components/media/EmbyContinueWatching';
import StudioCarousel from '../components/media/StudioCarousel';
import DebridHomeRows from '../components/media/DebridHomeRows';
import DiscoverRows from '../components/media/DiscoverRows';
import VpnStatusBadge from '../components/flags/VpnStatusBadge';
import ServerMiniBox from '../components/dashboard/ServerMiniBox';

export default function Home() {
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['media'] });
    await queryClient.invalidateQueries({ queryKey: ['mediaServers'] });
    await queryClient.invalidateQueries({ queryKey: ['embyContinueWatching'] });
  };

  const { data: servers = [] } = useQuery({
    queryKey: ['mediaServers'],
    queryFn: () => base44.entities.MediaServer.list(),
    staleTime: 60 * 1000,
  });
  const embyServer = servers.find(s => s.server_type === 'emby' && s.is_active !== false);
  const mediaServers = servers.filter(
    s => ['emby', 'plex', 'jellyfin', 'torbox'].includes(s.server_type) && s.is_active !== false
  );

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="pb-20">
        <HomeSearchBar />

        <div className="px-4 mt-4 mb-1 flex items-center">
          <VpnStatusBadge />
        </div>

        {mediaServers.length > 0 && (
          <div className="mt-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {mediaServers.map(s => (
              <div key={s.id} className="min-w-[240px] flex-1 shrink-0">
                <ServerMiniBox server={s} />
              </div>
            ))}
          </div>
        )}

        {embyServer && (
          <div className="mt-4">
            <EmbyContinueWatching serverId={embyServer.id} />
          </div>
        )}

        <DebridHomeRows />

        <StudioCarousel />

        <DiscoverRows />
      </div>
    </PullToRefresh>
  );
}