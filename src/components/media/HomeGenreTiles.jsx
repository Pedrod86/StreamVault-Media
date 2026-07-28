import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import GenreRow from './GenreRow';
import { Skeleton } from '@/components/ui/skeleton';

// Android-TV-style genre tiles on the homepage: a horizontal row of 16:9
// landscape tiles, each labelled with a genre, that open the Genres page.
export default function HomeGenreTiles({ serverId } = {}) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['embyGenreRows', serverId || 'default'],
    queryFn: () => base44.functions.invoke('embyGenreRows', serverId ? { serverId } : {}).then(r => r.data),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="mb-10 mt-6">
        <Skeleton className="h-6 w-40 mb-4 mx-4 sm:mx-6 bg-secondary" />
        <div className="flex gap-4 px-4 sm:px-6">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="shrink-0 w-[240px] sm:w-[300px] aspect-[16/9] rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  const rows = data?.rows;
  if (!rows?.length) return null;

  const entries = rows.map(r => ({
    genre: r.genre,
    posterUrl: r.items?.[0]?.posterUrl,
    items: r.items,
  }));

  return (
    <div className="mt-6">
      <GenreRow
        title="Movies Genres"
        entries={entries}
        onClick={(genre) => navigate(`/genres?genre=${encodeURIComponent(genre)}`)}
      />
    </div>
  );
}