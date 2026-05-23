import React from 'react';
import MediaCard from './MediaCard';
import { CheckCircle2 } from 'lucide-react';

export default function MediaGrid({ items, watchHistory, selectedIds, onToggleSelect }) {
  const selectionMode = !!onToggleSelect;

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-lg">No items found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map((media) => {
        const progress = watchHistory?.find(h => h.media_id === media.id);
        const isSelected = selectedIds?.has(media.id);

        if (selectionMode) {
          return (
            <div
              key={media.id}
              className="relative cursor-pointer"
              onClick={() => onToggleSelect(media.id)}
            >
              <div className={`rounded-xl transition-all duration-150 ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background opacity-80' : 'hover:opacity-90'}`}>
                <MediaCard media={media} showProgress={!!progress} progress={progress} disableNavigation />
              </div>
              {isSelected && (
                <div className="absolute top-2 left-2 z-10">
                  <CheckCircle2 className="w-6 h-6 text-primary fill-primary bg-background rounded-full" />
                </div>
              )}
              {!isSelected && (
                <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 border-white/60 bg-black/40" />
              )}
            </div>
          );
        }

        return <MediaCard key={media.id} media={media} showProgress={!!progress} progress={progress} />;
      })}
    </div>
  );
}