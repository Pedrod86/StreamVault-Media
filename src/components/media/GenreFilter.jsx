import React from 'react';
import { Button } from '@/components/ui/button';

const GENRES = [
  'All', 'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi',
  'Thriller', 'Romance', 'Documentary', 'Animation', 'Fantasy', 'Adventure'
];

export default function GenreFilter({ selected, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
      {GENRES.map((genre) => (
        <Button
          key={genre}
          variant={selected === genre ? 'default' : 'outline'}
          size="sm"
          className={`shrink-0 rounded-full text-xs font-medium h-8 ${
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