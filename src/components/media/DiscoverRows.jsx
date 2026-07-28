import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import MediaRow from './MediaRow';
import HomeGenreTiles from './HomeGenreTiles';
import EmbyLiveRow from './EmbyLiveRow';

// Score a title for "popular": prefer highly-rated, recent.
const popularScore = (m) => (m.rating || 0) + (m.year ? (m.year - 1990) / 25 : 0);

export default function DiscoverRows() {
  const { data: media = [], isLoading } = useQuery({
    queryKey: ['media', 'home-rows'],
    queryFn: () => base44.entities.Media.filter({ tags: 'emby' }, '-created_date', 600),
    staleTime: 5 * 60 * 1000,
  });

  const { popularShows } = useMemo(() => {
    const shows = media.filter(m => m.media_type === 'tv_show');
    return { popularShows: [...shows].sort((a, b) => popularScore(b) - popularScore(a)).slice(0, 24) };
  }, [media]);

  if (isLoading) {
    return (
      <div className="space-y-10 mt-6">
        {[1, 2, 3, 4].map(row => (
          <div key={row}>
            <Skeleton className="h-6 w-44 mb-4 mx-4 sm:mx-6 bg-secondary" />
            <div className="flex gap-4 px-4 sm:px-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px] aspect-[2/3] rounded-xl bg-secondary" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <EmbyLiveRow title="Popular Movies" itemType="Movie" />
      <MediaRow title="Popular TV Shows" items={popularShows} />
      <HomeGenreTiles itemType="Movie" title="Movies Genres" />
      <HomeGenreTiles itemType="Series" title="TV Show Genres" />
    </div>
  );
}