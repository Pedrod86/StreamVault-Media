import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Server, ChevronDown } from 'lucide-react';

/**
 * Play button that lets the user choose a playback source when a title is
 * available on more than one server (e.g. Emby AND Jellyfin).
 * When only one source is available it behaves as a plain Play button.
 */
export default function PlaySourcePicker({ hasEmby, hasJellyfin, label, onPlay }) {
  const [open, setOpen] = useState(false);
  const sources = [];
  if (hasEmby) sources.push({ id: 'emby', name: 'Play with Emby', color: 'text-green-400' });
  if (hasJellyfin) sources.push({ id: 'jellyfin', name: 'Play with Jellyfin', color: 'text-blue-400' });

  // Single (or zero) source — plain button, default to the available source.
  if (sources.length <= 1) {
    return (
      <Button
        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-11 px-6 rounded-xl font-semibold select-none"
        onClick={() => onPlay(sources[0]?.id || 'emby')}
      >
        <Play className="w-4 h-4 fill-current" />
        {label}
      </Button>
    );
  }

  // Multiple sources — offer a choice.
  return (
    <div className="relative">
      <Button
        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-11 px-6 rounded-xl font-semibold select-none"
        onClick={() => setOpen(o => !o)}
      >
        <Play className="w-4 h-4 fill-current" />
        {label}
        <ChevronDown className="w-4 h-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-12 left-0 w-52 bg-card border border-border rounded-xl overflow-hidden shadow-2xl z-30">
            <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Choose source
            </div>
            <div className="p-1.5 space-y-0.5">
              {sources.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setOpen(false); onPlay(s.id); }}
                  className="w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <Server className={`w-4 h-4 ${s.color}`} />
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}