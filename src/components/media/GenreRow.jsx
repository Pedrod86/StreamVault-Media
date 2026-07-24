import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Horizontal row of landscape genre tiles with imagy backgrounds, darkened
// overlays, and centred bold labels — as shown in the dashboard mock.
export default function GenreRow({ title, entries, onClick }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -420 : 420, behavior: 'smooth' });
  };

  if (!entries || entries.length === 0) return null;

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
        {entries.map((e) => (
          <button
            key={e.genre}
            onClick={() => onClick?.(e.genre, e.items)}
            className="shrink-0 w-[240px] sm:w-[300px] aspect-[16/9] rounded-xl overflow-hidden relative group snap-start focus:outline-none"
          >
            {e.posterUrl ? (
              <img
                src={e.posterUrl}
                alt={e.genre}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="absolute inset-0 bg-secondary" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30 group-hover:from-black/80 transition-colors" />
            <span className="absolute inset-0 flex items-center justify-center text-center px-3 font-heading font-bold text-lg sm:text-xl text-white drop-shadow-lg">
              {e.genre}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}