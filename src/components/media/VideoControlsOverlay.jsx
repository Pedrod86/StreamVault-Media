import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize, Minimize, PictureInPicture2 } from 'lucide-react';

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
// Provides rewind 10s, play/pause, forward 10s, a draggable seek bar, plus
// mute, picture-in-picture and fullscreen toggles.
// Tap anywhere to toggle visibility; auto-hides after 3s while playing.
export default function VideoControlsOverlay({ videoRef }) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visible, setVisible] = useState(true);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [pip, setPip] = useState(false);
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
    const onVol = () => setMuted(v.muted);
    const onEnterPip = () => setPip(true);
    const onLeavePip = () => setPip(false);

    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('volumechange', onVol);
    v.addEventListener('enterpictureinpicture', onEnterPip);
    v.addEventListener('leavepictureinpicture', onLeavePip);
    if (v.duration) setDuration(v.duration);
    setMuted(v.muted);
    show();

    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('volumechange', onVol);
      v.removeEventListener('enterpictureinpicture', onEnterPip);
      v.removeEventListener('leavepictureinpicture', onLeavePip);
      clearTimeout(hideTimer.current);
    };
  }, [videoRef, show]);

  // Track fullscreen state of the document
  useEffect(() => {
    const fn = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fn);
    return () => document.removeEventListener('fullscreenchange', fn);
  }, []);

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
  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    show();
  };
  const togglePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture?.();
    } catch (_) {}
    show();
  };
  const toggleFullscreen = () => {
    const v = videoRef.current;
    const target = v?.parentElement || v;
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else target?.requestFullscreen?.();
    } catch (_) {}
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

          {/* Main playback buttons */}
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

          {/* Secondary controls: mute / PiP / fullscreen */}
          <div className="flex items-center justify-end gap-1 mt-3">
            <button
              onClick={toggleMute}
              className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/15 active:bg-white/25 transition-colors"
              aria-label="Mute"
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            {typeof document !== 'undefined' && document.pictureInPictureEnabled && (
              <button
                onClick={togglePip}
                className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/15 active:bg-white/25 transition-colors"
                aria-label="Picture in picture"
              >
                <PictureInPicture2 className={`w-5 h-5 ${pip ? 'text-primary' : ''}`} />
              </button>
            )}
            <button
              onClick={toggleFullscreen}
              className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/15 active:bg-white/25 transition-colors"
              aria-label="Fullscreen"
            >
              {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}