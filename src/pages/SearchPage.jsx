import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import MediaGrid from '../components/media/MediaGrid';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function SearchPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);

  const { data: allMedia = [] } = useQuery({
    queryKey: ['media'],
    queryFn: () => base44.entities.Media.list('-created_date', 500),
  });

  const filtered = query.trim()
    ? allMedia.filter(m => {
        const q = query.toLowerCase();
        return (
          m.title?.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.genre?.some(g => g.toLowerCase().includes(q)) ||
          m.cast?.some(c => c.toLowerCase().includes(q)) ||
          m.director?.toLowerCase().includes(q)
        );
      })
    : [];

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, shows, genres, cast..."
            className="pl-10 h-12 bg-secondary border-border text-foreground text-base rounded-xl"
          />
        </div>
      </div>

      {query.trim() ? (
        <>
          <p className="text-muted-foreground text-sm mb-4">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{query}"
          </p>
          <MediaGrid items={filtered} />
        </>
      ) : (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">Search your library</p>
          <p className="text-muted-foreground text-sm mt-1">Find movies, TV shows, actors, and more</p>
        </div>
      )}
    </div>
  );
}