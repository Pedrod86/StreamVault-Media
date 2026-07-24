import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmbyBrowseGrid from '@/components/media/EmbyBrowseGrid';
import { STUDIOS } from '@/lib/studios';

const PAGE_SIZE = 100;

// A media type filter strip: All / Movies / TV
const TYPE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'movie', label: 'Movies' },
  { key: 'tv_show', label: 'TV Shows' },
];

export default function Studios() {
  const [activeSlug, setActiveSlug] = useState(null);
  const [type, setType] = useState('all');

  const activeStudio = STUDIOS.find(s => s.slug === activeSlug) || null;

  const { data: servers = [] } = useQuery({
    queryKey: ['mediaServers'],
    queryFn: () => base44.entities.MediaServer.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });
  const embyServer = servers.find(s => s.server_type === 'emby' && s.is_active !== false);

  const studiosParam = activeStudio ? activeStudio.embyStudios.join(',') : '';

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['studioLibrary', activeSlug, type],
    enabled: !!activeStudio,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const res = await base44.functions.invoke('embyLibrary', {
        studios: studiosParam,
        itemType: type === 'all' ? '' : (type === 'movie' ? 'Movie' : 'Series'),
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

  const items = React.useMemo(() => {
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

  return (
    <div className="pt-16 pb-24">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 mb-4">
        <h1 className="font-heading font-bold text-2xl text-foreground">Studios & Networks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Filter your entire library by the studio or network that made it.
        </p>
      </div>

      {/* Studio filter strip */}
      <div className="px-4 sm:px-6 mb-2">
        <div className="flex gap-2.5 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide">
          {STUDIOS.map(studio => {
            const active = studio.slug === activeSlug;
            return (
              <button
                key={studio.slug}
                onClick={() => setActiveSlug(studio.slug)}
                className={`shrink-0 flex flex-col items-center gap-1.5 transition-transform ${active ? 'scale-105' : 'opacity-80 hover:opacity-100'}`}
              >
                <span
                  className={`w-20 h-12 rounded-lg border-2 flex items-center justify-center p-2 transition-colors ${active ? 'border-primary shadow-lg shadow-primary/30' : 'border-border'}`}
                  style={{ backgroundColor: studio.bg }}
                >
                  <img src={studio.logo} alt={studio.name} className="max-h-6 max-w-full object-contain" />
                </span>
                <span className={`text-[11px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                  {studio.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Type tabs — only relevant once a studio is picked */}
      {activeStudio && (
        <div className="px-4 sm:px-6 mb-3 flex items-center gap-2">
          {TYPE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setType(tab.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${type === tab.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="px-4 sm:px-6">
        {!activeStudio ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Select a studio above to browse its titles.</p>
          </div>
        ) : isLoading ? (
          <EmbyBrowseGrid isLoading />
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No {activeStudio.name} titles in your library</p>
            <Link to={`/studio/${activeStudio.slug}`} className="text-primary text-sm mt-2 inline-block">
              View dedicated studio page
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">{total.toLocaleString()} titles from {activeStudio.name}</p>
            <EmbyBrowseGrid items={items} server={server} />
            {hasNextPage && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="gap-2">
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