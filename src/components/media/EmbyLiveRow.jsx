import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, Star, Play, Film, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EmbyVideoPlayer from './EmbyVideoPlayer';
import EmbySeriesBrowser from './EmbySeriesBrowser';

// Horizontal row of titles fetched live from the connected Emby server.
// Tapping a card plays it directly from Emby (movie → stream, series → episode
// browser), so it never depends on a local Media record resolving.
export default function EmbyLiveRow({ title, itemType, sortBy = 'CommunityRating,Descending' }) {
  const scrollRef = useRef(null);
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['embyPopular', itemType, sortBy],
    queryFn: async () => {
      const res = await base44.functions.invoke('embyLibrary', { itemType, sortBy, startIndex: 0, pageSize: 24 });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const server = data?.server;
  const items = data?.items || [];
  const isSeries = itemType === 'Series';

  const scroll = (dir) => scrollRef.current?.scrollBy({ left: dir === 'left' ? -420 : 420, behavior: 'smooth' });

  if (!isLoading && items.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4 px-4 sm:px-6">
        <h2 className="font-heading font-bold text-lg sm:text-xl text-foreground">{title}</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => scroll('left')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => scroll('right')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 sm:px-6 pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px] aspect-[2/3] rounded-xl bg-secondary" />
            ))
          : items.map((it) => (
              <button
                key={it.id}
                onClick={() => setSelected(it)}
                className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px] group text-left snap-start"
              >
                <div className="aspect-[2/3] relative rounded-xl overflow-hidden bg-card border border-border/50 shadow-lg shadow-black/20 group-hover:shadow-2xl group-hover:border-primary/40 transition-all">
                  {it.posterUrl ? (
                    <img
                      src={it.posterUrl}
                      alt={it.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center">
                      {isSeries ? <Tv className="w-10 h-10 text-muted-foreground" /> : <Film className="w-10 h-10 text-muted-foreground" />}
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded text-white ${isSeries ? 'bg-purple-500/85' : 'bg-blue-500/85'}`}>
                      {isSeries ? 'TV' : 'Movie'}
                    </span>
                  </div>
                  {it.rating && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 rounded-md px-1.5 py-0.5">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-semibold text-white">{it.rating.toFixed(1)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="text-xs font-medium text-foreground truncate mt-2 px-0.5">{it.title}</p>
                {it.year && <p className="text-[10px] text-muted-foreground px-0.5">{it.year}</p>}
              </button>
            ))}
      </div>

      {selected && server && isSeries && (
        <EmbySeriesBrowser
          item={{ embyId: selected.id, title: selected.title, poster_url: selected.posterUrl, year: selected.year }}
          server={server}
          onClose={() => setSelected(null)}
        />
      )}
      {selected && server && !isSeries && (
        <EmbyVideoPlayer
          item={{ id: selected.id, title: selected.title, posterUrl: selected.posterUrl, year: selected.year }}
          server={server}
          onClose={() => setSelected(null)}
          initialPlayerId="direct"
          initialSubtitleIndex={-1}
        />
      )}
    </section>
  );
}