import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STUDIOS } from '@/lib/studios';

// "Studios" section — horizontal logo carousel with left/right scroll arrows,
// matching the dashboard row treatment.
export default function StudioCarousel() {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  };

  return (
    <section className="mb-10 mt-6">
      <div className="flex items-center justify-between mb-4 px-4 sm:px-6">
        <h2 className="font-heading font-bold text-lg sm:text-xl text-foreground">Studios</h2>
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
        className="flex gap-3 overflow-x-auto scrollbar-hide px-4 sm:px-6 pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {STUDIOS.map((s) => (
          <Link
            key={s.slug}
            to={`/studio/${s.slug}`}
            className="shrink-0 w-32 h-16 rounded-xl border border-border flex items-center justify-center p-3 hover:scale-[1.04] active:scale-[0.97] transition-transform snap-start"
            style={{ backgroundColor: s.bg }}
            aria-label={s.name}
          >
            <img src={s.logo} alt={s.name} className="max-h-8 max-w-full object-contain" loading="lazy" />
          </Link>
        ))}
      </div>
    </section>
  );
}