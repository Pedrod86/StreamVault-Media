import React, { useMemo } from 'react';
import MediaRow from './MediaRow';
import { Sparkles } from 'lucide-react';

// Genre groups: each "theme" can match multiple genre keywords
const THEME_GROUPS = [
  { id: 'action',    label: 'Action & Adventure',  keywords: ['action', 'adventure', 'thriller'] },
  { id: 'comedy',    label: 'Comedy',               keywords: ['comedy'] },
  { id: 'drama',     label: 'Drama',                keywords: ['drama'] },
  { id: 'horror',    label: 'Horror & Mystery',     keywords: ['horror', 'mystery', 'suspense'] },
  { id: 'scifi',     label: 'Sci-Fi & Fantasy',     keywords: ['science fiction', 'sci-fi', 'fantasy'] },
  { id: 'romance',   label: 'Romance',              keywords: ['romance', 'romantic'] },
  { id: 'crime',     label: 'Crime & Thriller',     keywords: ['crime', 'thriller', 'noir'] },
  { id: 'documentary', label: 'Documentary',        keywords: ['documentary', 'reality'] },
  { id: 'animation', label: 'Animation',            keywords: ['animation', 'animated'] },
  { id: 'western',   label: 'Western & War',        keywords: ['western', 'war', 'history', 'historical'] },
];

export default function GenreRecommendations({ allMedia, watchHistory }) {
  const rows = useMemo(() => {
    if (!allMedia?.length) return [];

    const results = [];

    for (const theme of THEME_GROUPS) {
      const matched = allMedia.filter(m =>
        m.genre?.some(g =>
          theme.keywords.some(kw => g.toLowerCase().includes(kw))
        )
      );
      if (matched.length >= 4) {
        // Sort by rating desc within each theme
        const sorted = [...matched].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        results.push({ ...theme, items: sorted });
      }
    }

    return results;
  }, [allMedia]);

  if (!rows.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-4 sm:px-6 pt-2 pb-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="font-heading font-bold text-base text-foreground">Browse by Theme</h2>
      </div>
      {rows.map(row => (
        <MediaRow
          key={row.id}
          title={row.label}
          items={row.items}
          watchHistory={watchHistory}
        />
      ))}
    </div>
  );
}