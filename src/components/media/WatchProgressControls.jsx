import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { CheckCircle2, Circle, SlidersHorizontal } from 'lucide-react';

// Lets the user manually mark a title watched/unwatched and set playback progress.
// `historyKey` is the same media_id key used by WatchHistory / Resume logic.
export default function WatchProgressControls({ historyKey, durationMinutes, historyEntry }) {
  const queryClient = useQueryClient();
  const [showProgress, setShowProgress] = useState(false);

  const totalSeconds = (historyEntry?.total_seconds) || (durationMinutes ? durationMinutes * 60 : 0);
  const [progressPct, setProgressPct] = useState(0);

  useEffect(() => {
    if (historyEntry && totalSeconds > 0) {
      setProgressPct(Math.min(100, Math.round((historyEntry.progress_seconds / totalSeconds) * 100)));
    }
  }, [historyEntry, totalSeconds]);

  const isWatched = !!historyEntry?.completed;

  const upsert = useMutation({
    mutationFn: async (data) => {
      const existing = await base44.entities.WatchHistory.filter({ media_id: historyKey });
      const entry = existing[0];
      const payload = {
        media_id: historyKey,
        last_watched: new Date().toISOString(),
        ...data,
      };
      if (entry) return base44.entities.WatchHistory.update(entry.id, payload);
      return base44.entities.WatchHistory.create(payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchHistory'] }),
  });

  const toggleWatched = () => {
    upsert.mutate({
      progress_seconds: isWatched ? 0 : totalSeconds,
      total_seconds: totalSeconds,
      completed: !isWatched,
    });
  };

  const saveProgress = () => {
    const secs = Math.round((progressPct / 100) * totalSeconds);
    upsert.mutate({
      progress_seconds: secs,
      total_seconds: totalSeconds,
      completed: progressPct >= 99,
    });
    setShowProgress(false);
  };

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <Button
        variant="outline"
        className="border-border text-foreground hover:bg-secondary gap-2 h-11 px-5 rounded-xl select-none"
        onClick={toggleWatched}
        disabled={upsert.isPending}
      >
        {isWatched ? (
          <><CheckCircle2 className="w-4 h-4 text-green-400" /> Watched</>
        ) : (
          <><Circle className="w-4 h-4" /> Mark as Watched</>
        )}
      </Button>

      {totalSeconds > 0 && (
        <Button
          variant="outline"
          className="border-border text-foreground hover:bg-secondary gap-2 h-11 px-5 rounded-xl select-none"
          onClick={() => setShowProgress(p => !p)}
        >
          <SlidersHorizontal className="w-4 h-4" /> Update Progress
        </Button>
      )}

      {showProgress && totalSeconds > 0 && (
        <div className="w-full bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Playback progress</span>
            <span className="text-sm font-semibold text-foreground">{progressPct}%</span>
          </div>
          <Slider
            value={[progressPct]}
            onValueChange={(v) => setProgressPct(v[0])}
            max={100}
            step={1}
            className="mb-4"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" className="rounded-lg" onClick={() => setShowProgress(false)}>Cancel</Button>
            <Button className="bg-primary hover:bg-primary/90 rounded-lg" onClick={saveProgress} disabled={upsert.isPending}>Save</Button>
          </div>
        </div>
      )}
    </div>
  );
}