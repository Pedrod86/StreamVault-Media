import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Mic, ExternalLink, Play, ChevronDown, ChevronUp, Headphones } from 'lucide-react';

const QUICK_SEARCHES = [
  'true crime', 'technology', 'comedy', 'history', 'science',
  'news', 'business', 'health & wellness', 'sport', 'storytelling',
];

export default function Discover() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedPodcast, setExpandedPodcast] = useState(null);

  const search = async (q) => {
    const term = q || query;
    if (!term.trim()) return;
    setLoading(true);
    setResults([]);
    setSearched(true);
    setExpandedPodcast(null);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Find popular podcasts matching: "${term}".

Return up to 12 podcasts. For each provide:
- title: podcast name
- author: host or creator name
- description: 2-3 sentence description of the podcast
- category: main category (e.g. "True Crime", "Comedy", "Technology")
- language: language (e.g. "English")
- feed_url: RSS feed URL if known (or empty string)
- website_url: official website or listen page URL
- image_url: podcast cover art URL (use a real image URL if known, otherwise empty string)
- episodes: array of 3 recent/notable episode titles (just strings)`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                author: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string' },
                language: { type: 'string' },
                feed_url: { type: 'string' },
                website_url: { type: 'string' },
                image_url: { type: 'string' },
                episodes: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    });

    setResults(res?.results || []);
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') search();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-foreground mb-1 flex items-center gap-2">
            <Mic className="w-7 h-7 text-primary" /> Find Your Podcast
          </h1>
          <p className="text-muted-foreground text-sm">
            Search millions of podcasts — discover new shows, browse episodes, and find your next favourite listen.
          </p>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Search by topic, show name, or host…"
              className="pl-9 bg-card border-border"
            />
          </div>
          <Button onClick={() => search()} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </Button>
        </div>

        {/* Quick searches */}
        {!searched && (
          <div className="mb-8">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Browse by topic</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_SEARCHES.map((qs) => (
                <button
                  key={qs}
                  onClick={() => { setQuery(qs); search(qs); }}
                  className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs hover:bg-primary hover:text-primary-foreground transition-colors capitalize"
                >
                  {qs}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Finding podcasts…</p>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="space-y-3">
            {results.map((pod, i) => {
              const isExpanded = expandedPodcast === i;
              return (
                <div
                  key={i}
                  className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all"
                >
                  <div className="flex gap-4 p-4">
                    {/* Cover art */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-secondary shrink-0 overflow-hidden flex items-center justify-center">
                      {pod.image_url ? (
                        <img
                          src={pod.image_url}
                          alt={pod.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <Headphones className="w-8 h-8 text-muted-foreground/40" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-heading font-semibold text-foreground leading-tight line-clamp-1">
                            {pod.title}
                          </h3>
                          {pod.author && (
                            <p className="text-xs text-muted-foreground mt-0.5">by {pod.author}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {pod.website_url && (
                            <a
                              href={pod.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              title="Open podcast website"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {pod.feed_url && (
                            <a
                              href={pod.feed_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-orange-400 transition-colors"
                              title="RSS Feed"
                            >
                              <Play className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {pod.category && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">{pod.category}</Badge>
                        )}
                        {pod.language && pod.language.toLowerCase() !== 'english' && (
                          <span className="text-xs text-muted-foreground">{pod.language}</span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                        {pod.description}
                      </p>

                      {pod.episodes?.length > 0 && (
                        <button
                          className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                          onClick={() => setExpandedPodcast(isExpanded ? null : i)}
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {isExpanded ? 'Hide episodes' : `${pod.episodes.length} notable episodes`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Episodes */}
                  {isExpanded && pod.episodes?.length > 0 && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Notable Episodes</p>
                      {pod.episodes.map((ep, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm text-foreground/80 bg-secondary/40 rounded-lg px-3 py-2">
                          <Headphones className="w-3.5 h-3.5 text-primary shrink-0" />
                          {ep}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <Mic className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No podcasts found. Try a different search term.</p>
          </div>
        )}
      </div>
    </div>
  );
}