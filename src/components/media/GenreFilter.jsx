import React from 'react';
import { Button } from '@/components/ui/button';

const DEFAULT_GENRES = [
  'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi',
  'Thriller', 'Romance', 'Documentary', 'Animation', 'Fantasy', 'Adventure'
];

/**
 * genres: optional array of strings to show instead of defaults.
 *         If provided, these replace the hardcoded list (useful for dynamic Xtream categories).
 */
export default function GenreFilter({ selected, onChange, genres }) {
  const list = ['All', ...(genres && genres.length ? genres : DEFAULT_GENRES)];
  return (
    <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
      {list.map((genre) => (
        <Button
          key={genre}
          variant={selected === genre ? 'default' : 'outline'}
          size="sm"
          className={`shrink-0 rounded-full text-xs font-medium h-11 md:h-8 px-4 ${
            selected === genre
              ? 'bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
          onClick={() => onChange(genre)}
        >
          {genre}
        </Button>
      ))}
    </div>
  );
}