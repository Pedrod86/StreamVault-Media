import React from 'react';
import { Link } from 'react-router-dom';
import { STUDIOS } from '@/lib/studios';

// Horizontal strip of streaming-studio logos shown under the hero. Tapping a
// logo opens the per-studio browse page which scans the library for that brand.
export default function StudioLogos() {
  return (
    <div className="px-4 sm:px-6 mt-6">
      <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
        Studios & Networks
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {STUDIOS.map((studio) => (
          <Link
            key={studio.slug}
            to={`/studio/${studio.slug}`}
            className="shrink-0 w-28 h-16 rounded-xl border border-border flex items-center justify-center p-3 hover:scale-[1.04] active:scale-[0.97] transition-transform"
            style={{ backgroundColor: studio.bg }}
            aria-label={studio.name}
          >
            <img
              src={studio.logo}
              alt={studio.name}
              className="max-h-8 max-w-full object-contain"
              loading="lazy"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}