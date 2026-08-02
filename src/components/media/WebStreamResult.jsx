import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Film, Radio, Code2 } from 'lucide-react';

const KIND = {
  hls: { label: 'HLS', icon: Radio, cls: 'bg-green-500/10 text-green-400' },
  dash: { label: 'DASH', icon: Radio, cls: 'bg-sky-500/10 text-sky-400' },
  file: { label: 'Video File', icon: Film, cls: 'bg-purple-500/10 text-purple-400' },
  embed: { label: 'Embed', icon: Code2, cls: 'bg-amber-500/10 text-amber-400' },
};

export default function WebStreamResult({ stream, onPlay }) {
  const meta = KIND[stream.kind] || KIND.file;
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground truncate">{stream.label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{stream.url}</p>
      </div>
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${meta.cls}`}>{meta.label}</span>
      <Button size="sm" className="h-8 gap-1.5 shrink-0" onClick={onPlay}>
        <Play className="w-3.5 h-3.5" fill="currentColor" /> Play
      </Button>
    </div>
  );
}