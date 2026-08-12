import React from 'react';
import { Film, Tv } from 'lucide-react';

export default function JsonImportPreview({ items }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-2 bg-secondary text-xs text-muted-foreground">
        {items.length} title{items.length === 1 ? '' : 's'} found — showing first 20
      </div>
      <div className="divide-y divide-border max-h-72 overflow-y-auto">
        {items.slice(0, 20).map((m, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2">
            {m.poster_url
              ? <img src={m.poster_url} alt="" className="w-8 h-12 object-cover rounded shrink-0" />
              : <div className="w-8 h-12 rounded bg-secondary shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground truncate">{m.title}</p>
              <p className="text-xs text-muted-foreground">{m.year || '—'}{m.genre?.length ? ` · ${m.genre.slice(0, 2).join(', ')}` : ''}</p>
            </div>
            {m.media_type === 'movie'
              ? <Film className="w-4 h-4 text-muted-foreground shrink-0" />
              : <Tv className="w-4 h-4 text-muted-foreground shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}