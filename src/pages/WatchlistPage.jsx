import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import MediaGrid from '../components/media/MediaGrid';
import { Skeleton } from '@/components/ui/skeleton';
import { BookmarkPlus } from 'lucide-react';

export default function WatchlistPage() {
  const { data: watchlist = [], isLoading: wlLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => base44.entities.Watchlist.list('-created_date', 200),
  });

  const { data: allMedia = [], isLoading: mediaLoading } = useQuery({
    queryKey: ['media'],
    queryFn: () => base44.entities.Media.list('-created_date', 500),
  });

  const isLoading = wlLoading || mediaLoading;

  const watchlistMedia = watchlist
    .map(w => allMedia.find(m => m.id === w.media_id))
    .filter(Boolean);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-6">My List</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-xl bg-secondary" />
          ))}
        </div>
      ) : watchlistMedia.length === 0 ? (
        <div className="text-center py-20">
          <BookmarkPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">Your watchlist is empty</p>
          <p className="text-muted-foreground text-sm mt-1">Browse and add movies or shows to your list</p>
        </div>
      ) : (
        <MediaGrid items={watchlistMedia} />
      )}
    </div>
  );
}