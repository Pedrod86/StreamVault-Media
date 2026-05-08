import React from 'react';
import MediaCard from './MediaCard';

export default function MediaGrid({ items, watchHistory }) {
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
        return <MediaCard key={media.id} media={media} showProgress={!!progress} progress={progress} />;
      })}
    </div>
  );
}