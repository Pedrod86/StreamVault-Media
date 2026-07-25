import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import MediaRow from './MediaRow';
import GenreRow from './GenreRow';
import EmbyLiveRow from './EmbyLiveRow';

// Score a title for "popular": prefer highly-rated, recent.
const popularScore = (m) => (m.rating || 0) + (m.year ? (m.year - 1990) / 25 : 0);

// Build a list of { genre, count, items, posterUrl } entries, ranked by how
// many titles in the given list belong to each genre (most popular first).
function buildGenreEntries(mediaList, limit = 8) {
  const byGenre = new Map();
  for (const m of mediaList) {
    for (const g of (m.genre || [])) {
      if (!g) continue;
      if (!byGenre.has(g)) byGenre.set(g, { genre: g, count: 0, items: [], posterUrl: m.poster_url });
      const e = byGenre.get(g);
      e.count++;
      if (e.items.length < 60) e.items.push(m);
    }
  }
  return [...byGenre.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export default function DiscoverRows() {
  const navigate = useNavigate();

  const { data: media = [], isLoading } = useQuery({
    queryKey: ['media', 'home-rows'],
    queryFn: () => base44.entities.Media.filter({ tags: 'emby' }, '-created_date', 600),
    staleTime: 5 * 60 * 1000,
  });

  const { popularMovies, popularShows, movieGenres, tvGenres } = useMemo(() => {
    const movies = media.filter(m => m.media_type === 'movie');
    const shows = media.filter(m => m.media_type === 'tv_show');
    return {
      popularMovies: [...movies].sort((a, b) => popularScore(b) - popularScore(a)).slice(0, 24),
      popularShows: [...shows].sort((a, b) => popularScore(b) - popularScore(a)).slice(0, 24),
      movieGenres: buildGenreEntries(movies, 8),
      tvGenres: buildGenreEntries(shows, 8),
    };
  }, [media]);

  const openGenre = (type) => (genre) => {
    const params = new URLSearchParams({ genre });
    if (type) params.set('type', type);
    navigate(`/genres?${params.toString()}`);
  };

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
      <GenreRow title="Movie Genres" entries={movieGenres} onClick={openGenre('Movie')} />
      <MediaRow title="Popular TV Shows" items={popularShows} />
      <GenreRow title="TV Show Genres" entries={tvGenres} onClick={openGenre('Series')} />
    </div>
  );
}