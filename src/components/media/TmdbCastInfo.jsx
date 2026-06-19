import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Clapperboard, Building2 } from 'lucide-react';

// Fetches rich details (cast, director, studio) from TMDB by title + year,
// shown on the detail page when the item lacks this info locally.
export default function TmdbCastInfo({ title, year, mediaType }) {
  const tmdbType = mediaType === 'tv_show' ? 'tv' : 'movie';

  const { data, isLoading } = useQuery({
    queryKey: ['tmdbCast', title, year, tmdbType],
    enabled: !!title,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      // 1. Search for the title
      const searchRes = await base44.functions.invoke('tmdbLookup', {
        action: 'search',
        query: title,
        media_type: tmdbType,
      });
      const results = searchRes.data?.results || [];
      if (!results.length) return null;

      // Pick best match: prefer same year, else first result
      const match =
        (year && results.find(r => String(r.year) === String(year))) ||
        results.find(r => r.media_type === tmdbType) ||
        results[0];
      if (!match?.tmdb_id) return null;

      // 2. Fetch full details for cast + crew
      const detailsRes = await base44.functions.invoke('tmdbLookup', {
        action: 'details',
        tmdb_id: match.tmdb_id,
        media_type: match.media_type === 'tv' ? 'tv' : 'movie',
      });
      return detailsRes.data || null;
    },
  });

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="h-4 w-24 bg-secondary rounded mb-3 animate-pulse" />
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="shrink-0 w-20">
              <div className="w-20 h-20 rounded-full bg-secondary animate-pulse mb-2" />
              <div className="h-3 w-16 bg-secondary rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cast = data?.cast?.filter(c => c.name) || [];
  const studio = data?.production_companies?.[0]?.name || data?.networks?.[0]?.name;

  if (!cast.length && !studio) return null;

  return (
    <div className="mb-8">
      {studio && (
        <div className="flex items-center gap-2 mb-5 text-sm">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Studio:</span>
          <span className="text-foreground font-medium">{studio}</span>
        </div>
      )}

      {cast.length > 0 && (
        <>
          <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Cast
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {cast.map(person => (
              <div key={person.id} className="shrink-0 w-20 text-center">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-secondary mb-2 mx-auto">
                  {person.photo ? (
                    <img src={person.photo} alt={person.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="w-7 h-7 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-foreground leading-tight line-clamp-2">{person.name}</p>
                {person.character && (
                  <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2 mt-0.5">{person.character}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}