import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const DAYS = 30;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const mins = payload[0].value;
  return (
    <div className="rounded-lg bg-popover border border-border px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="text-xs text-primary">
        {mins >= 60 ? `${(mins / 60).toFixed(1)} hrs` : `${mins} min`} watched
      </p>
    </div>
  );
}

export default function WatchTimeChart() {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['watchHistory'],
    queryFn: () => base44.entities.WatchHistory.list('-last_watched', 1000),
    staleTime: 5 * 60 * 1000,
  });

  const { chartData, totalMinutes, progressPct, activeDays } = useMemo(() => {
    // Build an ordered map of the last 30 days (oldest → newest)
    const buckets = [];
    const indexByKey = new Map();
    const now = new Date();
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      indexByKey.set(key, buckets.length);
      buckets.push({
        key,
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        minutes: 0,
      });
    }

    let totalCompleted = 0;
    let totalSecondsAll = 0;
    let watchedSecondsAll = 0;

    history.forEach(h => {
      const secs = h.progress_seconds || 0;
      // Overall library progress (across all history, not just last month)
      watchedSecondsAll += secs;
      totalSecondsAll += h.total_seconds || 0;
      if (h.completed) totalCompleted += 1;

      // Bucket into the last-30-days chart by last_watched date
      if (!h.last_watched) return;
      const key = new Date(h.last_watched).toISOString().slice(0, 10);
      const idx = indexByKey.get(key);
      if (idx != null) buckets[idx].minutes += secs / 60;
    });

    buckets.forEach(b => { b.minutes = Math.round(b.minutes); });

    const totalMins = buckets.reduce((a, b) => a + b.minutes, 0);
    const active = buckets.filter(b => b.minutes > 0).length;

    // Progress = completed portion of everything with a known duration
    const pct = totalSecondsAll > 0
      ? Math.min(100, Math.round((watchedSecondsAll / totalSecondsAll) * 100))
      : (history.length > 0 ? Math.round((totalCompleted / history.length) * 100) : 0);

    return {
      chartData: buckets,
      totalMinutes: totalMins,
      progressPct: pct,
      activeDays: active,
    };
  }, [history]);

  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="px-4 sm:px-6 mb-6">
      <div className="rounded-2xl bg-card border border-border p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary shrink-0" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Last 30 Days</p>
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="font-heading font-bold text-3xl sm:text-4xl text-foreground leading-none">
                {isLoading ? '—' : totalHours}
              </span>
              <span className="text-sm text-muted-foreground">hours watched</span>
            </div>
            {!isLoading && (
              <p className="text-xs text-muted-foreground mt-1">
                across {activeDays} active {activeDays === 1 ? 'day' : 'days'}
              </p>
            )}
          </div>

          {/* Overall library progress ring */}
          <div className="relative w-16 h-16 shrink-0">
            <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-secondary" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                className="stroke-primary transition-all duration-700"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(progressPct / 100) * 97.4} 97.4`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading font-bold text-sm text-foreground leading-none">{progressPct}%</span>
              <span className="text-[9px] text-muted-foreground mt-0.5">done</span>
            </div>
          </div>
        </div>

        <div className="h-44 -mx-2">
          {isLoading ? (
            <Skeleton className="w-full h-full rounded-xl bg-secondary" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  interval={4}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tickFormatter={(v) => (v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`)}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.4 }} />
                <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}