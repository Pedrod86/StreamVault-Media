import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchServerLibrary } from '@/lib/serverSync';

/**
 * Runs background auto-sync based on the saved sync_interval_minutes setting.
 * Mounted once in AppLayout so it persists across page navigations.
 */
export function useAutoSync() {
  const queryClient = useQueryClient();
  const intervalRef = useRef(null);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const { data: servers = [] } = useQuery({
    queryKey: ['mediaServers'],
    queryFn: () => base44.entities.MediaServer.list('-created_date'),
  });

  const settings = settingsList[0];
  const syncMinutes = settings?.sync_interval_minutes ?? 0;

  useEffect(() => {
    clearInterval(intervalRef.current);

    const mediaServers = servers.filter(s => s.server_type !== 'trakt' && s.is_active !== false);
    if (syncMinutes <= 0 || mediaServers.length === 0) return;

    const doSync = async () => {
      for (const server of mediaServers) {
        try {
          const items = await fetchServerLibrary(server);
          if (!items.length) continue;
          const existing = await base44.entities.Media.list('-created_date', 500);
          const existingMap = new Map(existing.map(m => [m.title.toLowerCase().trim(), m]));
          const newItems = items.filter(item => !existingMap.has(item.title.toLowerCase().trim()));
          const BATCH = 50;
          for (let i = 0; i < newItems.length; i += BATCH) {
            await base44.entities.Media.bulkCreate(newItems.slice(i, i + BATCH));
          }
          if (newItems.length > 0) {
            queryClient.invalidateQueries({ queryKey: ['media'] });
          }
        } catch {
          // Silently ignore per-server errors in background sync
        }
      }
    };

    intervalRef.current = setInterval(doSync, syncMinutes * 60 * 1000);
    return () => clearInterval(intervalRef.current);
  }, [syncMinutes, servers, queryClient]);
}