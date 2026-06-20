import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Play, Star, Bookmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Renders the user's watchlist as live Emby items. Watchlist entries are keyed
// on `emby:<id>`; we fetch each item's details directly from Emby.
function Card({ item, onNavigate }) {
  const handleClick = () => {
    const params = new URLSearchParams({
      type: item.type || 'Movie',
      title: item.title || '',
      ...(item.posterUrl ? { poster: item.posterUrl } : {}),
    });
    onNavigate(`/media/emby:${item.id}?${params.toString()}`);
  };

  return (
    <div className="shrink-0 w-[140px] sm:w-[160px] cursor-pointer group" onClick={handleClick}>
      <div className="relative rounded-xl overflow-hidden bg-secondary aspect-[2/3] mb-2">
        {item.posterUrl ? (
          <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Play className="w-8 h-8 text-muted-foreground" /></div>
        )}
        {item.rating && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 rounded-full px-1.5 py-0.5">
            <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
            <span className="text-white text-[10px] font-medium">{item.rating.toFixed(1)}</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge className="text-[9px] px-1 py-0 bg-accent/90 text-accent-foreground">{item.type === 'Series' ? 'TV' : 'Movie'}</Badge>
        </div>
      </div>
      <p className="text-xs text-foreground font-medium truncate leading-tight">{item.title}</p>
      {item.year && <p className="text-[10px] text-muted-foreground mt-0.5">{item.year}</p>}
    </div>
  );
}

export default function EmbyWatchlistRow() {
  const navigate = useNavigate();

  const { data: watchlistItems = [] } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => base44.entities.Watchlist.list('-created_date', 200),
    staleTime: 5 * 60 * 1000,
  });

  const embyIds = watchlistItems
    .map(w => w.media_id)
    .filter(id => typeof id === 'string' && id.startsWith('emby:'))
    .map(id => id.slice(5));

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['embyWatchlistItems', embyIds.join(',')],
    enabled: embyIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await base44.functions.invoke('embyLibrary', { ids: embyIds, pageSize: 200 });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.items || [];
    },
  });

  if (embyIds.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Your watchlist is empty. Add items by pressing the bookmark icon on any title.
      </div>
    );
  }

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-4 sm:px-6 mb-3">
        <Bookmark className="w-4 h-4 text-primary" />
        <h2 className="font-heading font-bold text-base text-foreground">My Watchlist</h2>
      </div>
      {isLoading ? (
        <div className="flex gap-3 px-4 sm:px-6">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="w-[140px] h-[210px] rounded-xl bg-secondary shrink-0" />)}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto px-4 sm:px-6 pb-2" style={{ scrollbarWidth: 'none' }}>
          {items.map(item => <Card key={item.id} item={item} onNavigate={navigate} />)}
        </div>
      )}
    </div>
  );
}