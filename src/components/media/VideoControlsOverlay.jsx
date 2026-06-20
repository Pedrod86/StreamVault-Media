import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, RotateCw } from 'lucide-react';

function fmt(t) {
  if (!t || isNaN(t)) return '0:00';
  const s = Math.floor(t % 60);
  const m = Math.floor((t / 60) % 60);
  const h = Math.floor(t / 3600);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Custom touch-friendly control bar that drives a given <video> element.
// Provides rewind 10s, play/pause, forward 10s, and a draggable seek bar.
// Tap anywhere to toggle visibility; auto-hides after 3s while playing.
export default function VideoControlsOverlay({ videoRef }) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef(null);

  const show = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setVisible(false);
    }, 3000);
  }, [videoRef]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => { setPlaying(true); show(); };
    const onPause = () => { setPlaying(false); setVisible(true); clearTimeout(hideTimer.current); };
    const onTime = () => setCurrent(v.currentTime || 0);
    const onMeta = () => setDuration(v.duration || 0);

    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    if (v.duration) setDuration(v.duration);
    show();

    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      clearTimeout(hideTimer.current);
    };
  }, [videoRef, show]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };
  const seek = (delta) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min((v.duration || 0), (v.currentTime || 0) + delta));
    show();
  };
  const onScrub = (e) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    v.currentTime = (parseFloat(e.target.value) / 100) * v.duration;
    show();
  };

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="absolute inset-0 z-10" onClick={() => (visible ? null : show())}>
      {/* Tap-catch layer toggles visibility */}
      <button
        className="absolute inset-0 w-full h-full bg-transparent"
        onClick={() => setVisible((p) => !p)}
        aria-label="Toggle controls"
      />

      {visible && (
        <div
          className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-10 bg-gradient-to-t from-black/90 to-transparent"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Seek bar */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-white/80 text-xs tabular-nums w-12 text-right">{fmt(current)}</span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={pct}
              onChange={onScrub}
              className="flex-1 h-1.5 accent-primary cursor-pointer"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) ${pct}%, rgba(255,255,255,0.25) ${pct}%)`,
                borderRadius: 9999,
              }}
            />
            <span className="text-white/80 text-xs tabular-nums w-12">{fmt(duration)}</span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={() => seek(-10)}
              className="text-white/90 hover:text-white flex flex-col items-center gap-0.5"
            >
              <RotateCcw className="w-8 h-8" />
              <span className="text-[10px] font-semibold">10</span>
            </button>

            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
            >
              {playing ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>

            <button
              onClick={() => seek(10)}
              className="text-white/90 hover:text-white flex flex-col items-center gap-0.5"
            >
              <RotateCw className="w-8 h-8" />
              <span className="text-[10px] font-semibold">10</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}