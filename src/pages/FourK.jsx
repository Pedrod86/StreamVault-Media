import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Play, Star, Search, X, Loader2, Clapperboard, MonitorPlay, Film, Tv2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import EmbyVideoPlayer from '@/components/media/EmbyVideoPlayer';
import EmbySeriesBrowser from '@/components/media/EmbySeriesBrowser';
import { scanState, runScan } from '@/lib/embyScanState';

const IS_4K = (item) =>
  item.tags?.some(t => typeof t === 'string' && (/^4k$/i.test(t) || /4k|2160p|uhd/i.test(t))) ||
  !!item.title?.match(/\b(4K|UHD|2160p)\b/i) ||
  !!item.description?.match(/\b(4K|UHD|2160p)\b/i);

function FourKCard({ item, onPlay }) {
  return (
    <div
      className="cursor-pointer group"
      onClick={() => onPlay(item)}
    >
      <div className="relative rounded-xl overflow-hidden bg-secondary aspect-[2/3] mb-2">
        {item.poster_url ? (
          <img
            src={item.poster_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 fill-black text-black ml-0.5" />
          </div>
        </div>
        {item.rating && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 rounded-full px-1.5 py-0.5">
            <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
            <span className="text-white text-[10px] font-medium">{Number(item.rating).toFixed(1)}</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge className="text-[9px] px-1.5 py-0.5 bg-yellow-500 text-black font-bold shadow">4K</Badge>
        </div>
      </div>
      <p className="text-xs text-foreground font-medium truncate leading-tight">{item.title}</p>
      {item.year && <p className="text-[10px] text-muted-foreground mt-0.5">{item.year}</p>}
    </div>
  );
}

export default function FourK() {
  const [tab, setTab] = useState('movies'); // 'movies' | 'tv'
  const [search, setSearch] = useState('');
  const [playingItem, setPlayingItem] = useState(null);
  const [browsingItem, setBrowsingItem] = useState(null);
  const [scanProgress, setScanProgress] = useState({ loading: scanState.loading, done: scanState.done, count: scanState.library.length });

  // Subscribe to background scan so we pick up newly fetched items
  useEffect(() => {
    const listener = (state) => {
      setScanProgress({ loading: state.loading, done: state.done, count: state.library.length });
    };
    scanState.listeners.add(listener);
    if (!scanState.loading && !scanState.done) runScan();
    return () => scanState.listeners.delete(listener);
  }, []);

  const { data: servers = [] } = useQuery({
    queryKey: ['mediaServers'],
    queryFn: () => base44.entities.MediaServer.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });
  const embyServer = servers.find(s => s.server_type === 'emby' && s.is_active !== false);

  // Primary source: DB (persisted)
  const { data: dbLibrary = [], isLoading } = useQuery({
    queryKey: ['embyMedia'],
    queryFn: () => base44.entities.Media.filter({ tags: 'emby' }, 'title', 5000),
    staleTime: 2 * 60 * 1000,
  });

  // Merge DB items with in-memory scan state (scan state may have more items not yet in DB)
  const allItems = useMemo(() => {
    const dbIds = new Set(dbLibrary.map(i => i.id));
    const scanItems = scanState.library
      .filter(i => !dbIds.has(i.id))
      .map(i => ({
        id: i.id,
        title: i.title,
        media_type: i.type === 'Series' ? 'tv_show' : 'movie',
        year: i.year,
        rating: i.rating,
        poster_url: i.posterUrl,
        tags: i.is4k ? ['emby', '4k'] : ['emby'],
      }));
    const merged = [...dbLibrary, ...scanItems];

    // Deduplicate by normalized title — keep the entry with the most tags (most complete)
    const seen = new Map();
    for (const item of merged) {
      const key = (item.title || '').toLowerCase().trim();
      if (!seen.has(key)) {
        seen.set(key, item);
      } else {
        const existing = seen.get(key);
        // Prefer item with more tags or a poster
        const existingScore = (existing.tags?.length || 0) + (existing.poster_url ? 1 : 0) + (existing.rating ? 1 : 0);
        const newScore = (item.tags?.length || 0) + (item.poster_url ? 1 : 0) + (item.rating ? 1 : 0);
        if (newScore > existingScore) seen.set(key, item);
      }
    }
    return Array.from(seen.values());
  }, [dbLibrary, scanProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build embyId lookup + is4k lookup for TV shows from scan state
  const { embyIdByTitle, scanIs4kByTitle } = useMemo(() => {
    const idMap = new Map();
    const is4kMap = new Map();
    scanState.library.forEach(i => {
      if (i.title) {
        const key = i.title.toLowerCase().trim();
        idMap.set(key, i.id);
        if (i.is4k) is4kMap.set(key, true);
      }
    });
    return { embyIdByTitle: idMap, scanIs4kByTitle: is4kMap };
  }, [scanProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  // Augment DB items with scan-state 4k flag (covers TV shows not yet tagged in DB)
  const allItemsAugmented = useMemo(() => {
    return allItems.map(item => {
      const key = (item.title || '').toLowerCase().trim();
      if (!IS_4K(item) && scanIs4kByTitle.get(key)) {
        return { ...item, tags: [...(item.tags || []), '4k'] };
      }
      return item;
    });
  }, [allItems, scanIs4kByTitle]);

  const fourKMovies = useMemo(() => allItemsAugmented.filter(i => IS_4K(i) && i.media_type === 'movie'), [allItemsAugmented]);
  const fourKTV = useMemo(() => allItemsAugmented.filter(i => IS_4K(i) && i.media_type === 'tv_show'), [allItemsAugmented]);

  const activeList = tab === 'movies' ? fourKMovies : fourKTV;

  const filtered = useMemo(() => {
    if (!search.trim()) return activeList;
    const q = search.toLowerCase();
    return activeList.filter(i => i.title?.toLowerCase().includes(q));
  }, [activeList, search]);

  const handlePlay = (item) => {
    if (item.media_type === 'tv_show') {
      const embyId = embyIdByTitle.get(item.title?.toLowerCase().trim());
      setBrowsingItem({ ...item, embyId });
    } else {
      setPlayingItem(item);
    }
  };

  return (
    <div className="pt-16 pb-24">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <span className="text-yellow-400 font-bold text-sm">4K</span>
          </div>
          <div className="flex-1">
            <h1 className="font-heading font-bold text-xl text-foreground">4K Library</h1>
            <p className="text-xs text-muted-foreground">
              {fourKMovies.length} movies · {fourKTV.length} shows
              {scanProgress.loading && (
                <span className="ml-2 inline-flex items-center gap-1 text-accent">
                  <Loader2 className="w-3 h-3 animate-spin" /> scanning…
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTab('movies')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === 'movies' ? 'bg-yellow-500 text-black' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Movies
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === 'movies' ? 'bg-black/20 text-black' : 'bg-secondary-foreground/10 text-muted-foreground'}`}>
              {fourKMovies.length}
            </span>
          </button>
          <button
            onClick={() => setTab('tv')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === 'tv' ? 'bg-yellow-500 text-black' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Tv2 className="w-3.5 h-3.5" />
            TV Shows
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === 'tv' ? 'bg-black/20 text-black' : 'bg-secondary-foreground/10 text-muted-foreground'}`}>
              {fourKTV.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search 4K ${tab === 'movies' ? 'movies' : 'shows'}…`}
            className="pl-9 bg-secondary border-border rounded-xl"
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading && allItems.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
            {tab === 'movies' ? <Clapperboard className="w-8 h-8 text-yellow-400" /> : <MonitorPlay className="w-8 h-8 text-yellow-400" />}
          </div>
          <h2 className="font-heading font-bold text-xl text-foreground">
            {search ? 'No results' : `No 4K ${tab === 'movies' ? 'Movies' : 'TV Shows'} yet`}
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            {search
              ? `No 4K ${tab === 'movies' ? 'movies' : 'shows'} matching "${search}"`
              : scanProgress.loading
                ? 'Scanning your Emby library for 4K content…'
                : 'Sync your Emby library from Settings to detect 4K content.'}
          </p>
        </div>
      ) : (
        <div className="px-4 sm:px-6">
          {search && (
            <p className="text-xs text-muted-foreground mb-3">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"</p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {filtered.map(item => (
              <FourKCard key={item.id} item={item} onPlay={handlePlay} />
            ))}
          </div>
        </div>
      )}

      {/* Players */}
      {playingItem && embyServer && (() => {
        const tagEmbyId = (playingItem.tags || []).find(t => t?.startsWith('emby:') && t !== 'emby')?.replace('emby:', '');
        const urlMatch = (playingItem.video_url || '').match(/\/Videos\/([^/]+)\//);
        const embyId = playingItem.emby_id || tagEmbyId || (urlMatch ? urlMatch[1] : null) || playingItem.id;
        return (
          <EmbyVideoPlayer
            item={{ ...playingItem, id: embyId }}
            server={embyServer}
            onClose={() => setPlayingItem(null)}
          />
        );
      })()}

      {browsingItem && embyServer && (
        <EmbySeriesBrowser
          item={browsingItem}
          server={embyServer}
          onClose={() => setBrowsingItem(null)}
        />
      )}
    </div>
  );
}