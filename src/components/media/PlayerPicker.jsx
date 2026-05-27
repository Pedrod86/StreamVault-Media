import React from 'react';
import { Play, Check } from 'lucide-react';

export const PLAYERS = [
  {
    id: 'exoplayer',
    label: 'ExoPlayer (Default)',
    description: 'Built-in StreamVault player — optimised for mobile, supports all formats',
    icon: Play,
  },
  {
    id: 'hls',
    label: 'HLS Player',
    description: 'Adaptive HLS streaming via HLS.js — great for live & adaptive streams',
    icon: Play,
  },
];

export default function PlayerPicker({ current, onChange, onClose }) {
  return (
    <div className="absolute top-10 left-0 w-64 bg-card border border-border rounded-xl overflow-hidden shadow-2xl z-30">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-foreground text-sm font-semibold">Player</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
      </div>
      <div className="p-1.5 space-y-0.5">
        {PLAYERS.map(p => {
          const Icon = p.icon;
          const active = current === p.id;
          return (
            <button
              key={p.id}
              onClick={() => { onChange(p.id); onClose(); }}
              className={`w-full flex items-start gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                active ? 'bg-primary/20 text-primary' : 'text-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">{p.label}</div>
                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{p.description}</div>
              </div>
              {active && <Check className="w-4 h-4 shrink-0 mt-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}