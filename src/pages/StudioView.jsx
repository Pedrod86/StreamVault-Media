import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmbyBrowseGrid from '@/components/media/EmbyBrowseGrid';
import { getStudioBySlug } from '@/lib/studios';

const PAGE_SIZE = 100;

export default function StudioView() {
  const { slug } = useParams();
  const studio = getStudioBySlug(slug);

  const { data: servers = [] } = useQuery({
    queryKey: ['mediaServers'],
    queryFn: () => base44.entities.MediaServer.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });
  const embyServer = servers.find(s => s.server_type === 'emby' && s.is_active !== false);

  const studiosParam = studio ? studio.embyStudios.join(',') : '';

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['studioLibrary', slug],
    enabled: !!studio,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const res = await base44.functions.invoke('embyLibrary', {
        studios: studiosParam,
        startIndex: pageParam,
        pageSize: PAGE_SIZE,
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      const next = (lastPage.startIndex || 0) + (lastPage.items?.length || 0);
      return next < (lastPage.total || 0) ? next : undefined;
    },
    staleTime: 5 * 60 * 1000,
  });

  const server = data?.pages?.[0]?.server || embyServer;
  const total = data?.pages?.[0]?.total || 0;

  // Flatten pages and dedupe by title (Emby often has duplicate copies)
  const items = useMemo(() => {
    const all = (data?.pages || []).flatMap(p => p.items || []);
    const seen = new Set();
    const unique = [];
    for (const it of all) {
      const key = (it.title || '').toLowerCase().trim() + '|' + (it.year || '');
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(it);
    }
    return unique;
  }, [data]);

  if (!studio) {
    return (
      <div className="pt-20 pb-24 px-4 sm:px-6 text-center">
        <p className="text-muted-foreground">Studio not found.</p>
        <Link to="/" className="text-primary text-sm mt-2 inline-block">Back home</Link>
      </div>
    );
  }

  return (
    <div className="pt-16 pb-24">
      <div className="px-4 sm:px-6 pt-4 mb-5 flex items-center gap-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div
          className="w-24 h-12 rounded-lg border border-border flex items-center justify-center p-2 shrink-0"
          style={{ backgroundColor: studio.bg }}
        >
          <img src={studio.logo} alt={studio.name} className="max-h-6 max-w-full object-contain" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-lg text-foreground leading-tight">{studio.name}</h1>
          <p className="text-xs text-muted-foreground">
            {isLoading ? 'Scanning your library…' : `${total.toLocaleString()} titles`}
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6">
        {isLoading ? (
          <EmbyBrowseGrid isLoading />
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No {studio.name} titles in your library</p>
          </div>
        ) : (
          <>
            <EmbyBrowseGrid items={items} server={server} />
            {hasNextPage && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="gap-2"
                >
                  {isFetchingNextPage && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}