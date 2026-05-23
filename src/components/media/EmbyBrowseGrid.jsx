import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Tv, Film, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import EmbyVideoPlayer from './EmbyVideoPlayer';

// Maps Emby items to local DB media IDs by title
function useLocalMediaMap() {
  const { data: localMedia = [] } = useQuery({
    queryKey: ['mediaIdMap'],
    queryFn: () => base44.entities.Media.list('-created_date', 2000),
    staleTime: 10 * 60 * 1000,
  });
  const map = new Map();
  localMedia.forEach(m => map.set(m.title?.toLowerCase().trim(), m.id));
  return map;
}

function EmbyCard({ item, server, localIdMap }) {
  const navigate = useNavigate();
  const [showPlayer, setShowPlayer] = useState(false);
  const localId = localIdMap.get(item.title?.toLowerCase().trim());

  const handleClick = () => {
    if (localId) {
      navigate(`/media/${localId}`);
    } else {
      // Play directly from Emby even without a local record
      setShowPlayer(true);
    }
  };

  return (
    <>
      {showPlayer && server && (
        <EmbyVideoPlayer
          item={{ id: item.id, title: item.title, posterUrl: item.posterUrl, year: item.year }}
          server={server}
          onClose={() => setShowPlayer(false)}
          initialPlayerId="direct"
          initialSubtitleIndex={-1}
        />
      )}
      <div onClick={handleClick} className="group relative rounded-xl overflow-hidden bg-secondary flex flex-col cursor-pointer">
        <div className="aspect-[2/3] relative overflow-hidden bg-muted">
          {item.posterUrl ? (
            <img
              src={item.posterUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {item.type === 'Series' ? (
                <Tv className="w-10 h-10 text-muted-foreground" />
              ) : (
                <Film className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 fill-white text-white ml-0.5" />
            </div>
          </div>
          {item.rating && (
            <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
              <Star className="w-2.5 h-2.5 fill-yellow-400" />
              {item.rating.toFixed(1)}
            </div>
          )}
        </div>
        <div className="p-2">
          <p className="text-xs font-medium text-foreground truncate leading-tight">{item.title}</p>
          {item.year && <p className="text-[10px] text-muted-foreground mt-0.5">{item.year}</p>}
        </div>
      </div>
    </>
  );
}

export default function EmbyBrowseGrid({ items, server, isLoading }) {
  const localIdMap = useLocalMediaMap();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array(24).fill(0).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3] rounded-xl bg-secondary" />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-lg">No items found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map(item => (
        <EmbyCard key={item.id} item={item} server={server} localIdMap={localIdMap} />
      ))}
    </div>
  );
}