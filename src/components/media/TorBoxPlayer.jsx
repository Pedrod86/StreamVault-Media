import React, { useState } from 'react';
import { X, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TorBoxPlayer({ title, files, streamUrl, onClose }) {
  const initial = streamUrl || files?.[0]?.streamUrl || '';
  const [active, setActive] = useState(initial);
  const [errored, setErrored] = useState(false);
  const current = (files || []).find(f => f.streamUrl === active) || { name: title };
  const multi = files && files.length > 1;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/80 backdrop-blur shrink-0">
        <h2 className="text-sm font-semibold text-white truncate max-w-[65vw]">{current.name || title}</h2>
        <div className="flex items-center gap-2">
          <a href={active} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-white" title="Open in browser">
            <ExternalLink className="w-4 h-4" />
          </a>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 relative bg-black">
        {errored ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
            <AlertTriangle className="w-10 h-10 text-amber-400" />
            <div>
              <p className="text-white font-semibold mb-1">Can't play inside the app</p>
              <p className="text-muted-foreground text-sm mb-4">TorBox's CDN blocked in-app playback. Open it directly in your browser or external player.</p>
            </div>
            <a href={active} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">Open Stream</Button>
            </a>
          </div>
        ) : (
          <video
            key={active}
            src={active}
            controls
            autoPlay
            onError={() => setErrored(true)}
            className="absolute inset-0 w-full h-full"
          />
        )}
      </div>

      {multi && !errored && (
        <div className="shrink-0 max-h-44 overflow-auto bg-black/85 border-t border-white/10 p-2">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Files ({files.length})</p>
          {files.map(f => (
            <button
              key={f.id}
              onClick={() => { setActive(f.streamUrl); setErrored(false); }}
              className={`block w-full text-left text-xs px-2.5 py-1.5 rounded truncate transition-colors ${
                active === f.streamUrl ? 'bg-sky-500/20 text-sky-300' : 'text-white/80 hover:bg-white/5'
              }`}
              title={f.name}
            >
              {f.name}
              {f.sizeLabel && <span className="text-muted-foreground ml-2">· {f.sizeLabel}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}