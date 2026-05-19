import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import MediaRow from '../components/media/MediaRow';
import { Skeleton } from '@/components/ui/skeleton';
import { Database } from 'lucide-react';

const IS_4K = (m) =>
  m.tags?.some(t => /4k|2160p|uhd/i.test(t)) ||
  m.title?.match(/\b(4K|UHD|2160p)\b/i);

const IS_KIDS = (m) =>
  m.tags?.some(t => /kids?|children|family|animated/i.test(t)) ||
  m.genre?.some(g => /kids?|children|family|animation/i.test(g)) ||
  ['TV-Y', 'TV-G', 'G'].includes(m.content_rating);

export default function EmbyLibrary() {
  const { data: allMedia = [], isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: () => base44.entities.Media.list('-created_date', 5000),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const { data: watchHistory = [] } = useQuery({
    queryKey: ['watchHistory'],
    queryFn: () => base44.entities.WatchHistory.list('-updated_date', 50),
    staleTime: 5 * 60 * 1000,
  });

  // Only Emby items
  const embyMedia = useMemo(() => allMedia.filter(m => m.tags?.includes('emby')), [allMedia]);

  const sections = useMemo(() => {
    if (!embyMedia.length) return [];

    const movies = embyMedia.filter(m => m.media_type === 'movie' && !IS_4K(m));
    const shows = embyMedia.filter(m => m.media_type === 'tv_show' && !IS_4K(m));
    const movies4k = embyMedia.filter(m => m.media_type === 'movie' && IS_4K(m));
    const shows4k = embyMedia.filter(m => m.media_type === 'tv_show' && IS_4K(m));
    const kids = embyMedia.filter(IS_KIDS);

    // Genre rows — top 8 genres by item count
    const genreMap = {};
    embyMedia.forEach(m => {
      m.genre?.forEach(g => {
        if (!genreMap[g]) genreMap[g] = [];
        genreMap[g].push(m);
      });
    });
    const topGenres = Object.entries(genreMap)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8);

    const rows = [];
    if (movies.length)    rows.push({ title: 'Movies', items: movies });
    if (shows.length)     rows.push({ title: 'TV Shows', items: shows });
    if (movies4k.length)  rows.push({ title: '4K Movies', items: movies4k });
    if (shows4k.length)   rows.push({ title: '4K TV Shows', items: shows4k });
    if (kids.length)      rows.push({ title: "Kids", items: kids });
    topGenres.forEach(([genre, items]) => rows.push({ title: genre, items }));

    return rows;
  }, [embyMedia]);

  if (isLoading) {
    return (
      <div className="pt-20 pb-24 px-4 sm:px-6 space-y-8">
        {[1, 2, 3].map(i => (
          <div key={i}>
            <Skeleton className="h-6 w-40 mb-4 bg-secondary" />
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map(j => (
                <Skeleton key={j} className="w-[160px] h-[260px] rounded-xl bg-secondary shrink-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!embyMedia.length) {
    return (
      <div className="pt-20 pb-24 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
          <Database className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="font-heading font-bold text-xl text-foreground">No Emby content yet</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Connect your Emby server and run a sync to see your library here.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-24">
      <div className="px-4 sm:px-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl text-foreground">Emby Library</h1>
            <p className="text-xs text-muted-foreground">{embyMedia.length.toLocaleString()} items synced</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {sections.map(({ title, items }) => (
          <MediaRow key={title} title={title} items={items} watchHistory={watchHistory} />
        ))}
      </div>
    </div>
  );
}