import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const SOURCE_STYLE = {
  emby: 'bg-green-500/90 text-black',
  plex: 'bg-yellow-500/90 text-black',
};

export default function UnifiedLibraryGrid({ items }) {
  const navigate = useNavigate();

  const open = (item) => {
    const params = new URLSearchParams();
    if (item.type) params.set('type', item.type);
    if (item.title) params.set('title', item.title);
    if (item.posterUrl) params.set('poster', item.posterUrl);
    if (item.year) params.set('year', String(item.year));
    if (item.source === 'emby' && item.serverId) params.set('server', item.serverId);
    navigate(`/media/${item.source}:${item.id}?${params.toString()}`);
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 px-4 sm:px-6">
      {items.map(item => (
        <button key={`${item.source}:${item.id}`} onClick={() => open(item)} className="text-left group">
          <div className="relative rounded-xl overflow-hidden bg-secondary aspect-[2/3] mb-2">
            {item.posterUrl ? (
              <img src={item.posterUrl} alt={item.title} loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-7 h-7 text-muted-foreground" />
              </div>
            )}
            <Badge className={`absolute top-1.5 left-1.5 text-[9px] px-1 py-0 capitalize ${SOURCE_STYLE[item.source] || ''}`}>
              {item.source}
            </Badge>
          </div>
          <p className="text-xs text-foreground font-medium truncate leading-tight">{item.title}</p>
          {item.year && <p className="text-[10px] text-muted-foreground mt-0.5">{item.year}</p>}
        </button>
      ))}
    </div>
  );
}