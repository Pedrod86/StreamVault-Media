import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward } from 'lucide-react';

function formatTime(secs) {
  const s = Math.floor(secs);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export default function VideoPlayer({ src, title, onClose, onProgress, startAt = 0 }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hideControlsTimer = useRef(null);
  const lastSavedRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideControlsTimer.current);
  }, [playing]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); } else { v.play(); }
    resetHideTimer();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    videoRef.current.volume = val;
    setVolume(val);
    setMuted(val === 0);
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    videoRef.current.currentTime = val;
    setCurrentTime(val);
  };

  const skip = (secs) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + secs));
  };

  const toggleFullscreen = () => {
    if (!fullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Seek to resume position once metadata is ready
  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    if (startAt > 0 && startAt < v.duration - 5) {
      v.currentTime = startAt;
    }
  };

  const saveProgress = useCallback((completed = false) => {
    const v = videoRef.current;
    if (!v || !onProgress || v.currentTime < 2) return;
    const now = Math.round(v.currentTime);
    if (!completed && Math.abs(now - lastSavedRef.current) < 5) return;
    lastSavedRef.current = now;
    onProgress({ progressSeconds: now, totalSeconds: Math.round(v.duration), completed });
  }, [onProgress]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.buffered.length > 0) {
      setBuffered(v.buffered.end(v.buffered.length - 1));
    }
    // Save every 10s
    if (Math.round(v.currentTime) % 10 === 0 && v.currentTime > 5) {
      saveProgress(false);
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    setShowControls(true);
    saveProgress(true);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" ref={containerRef}>
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onPlay={() => setPlaying(true)}
        onPause={() => { setPlaying(false); setShowControls(true); saveProgress(false); }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onClick={togglePlay}
        onMouseMove={resetHideTimer}
      />

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onMouseMove={resetHideTimer}
        onClick={(e) => { if (e.target === e.currentTarget) togglePlay(); }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
          <h3 className="text-white font-semibold text-sm truncate max-w-[80%]">{title}</h3>
          <button
            className="text-white hover:text-white/70 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
            onClick={() => { saveProgress(false); onClose(); }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom controls */}
        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent space-y-2">
          {/* Progress bar */}
          <div className="relative h-1 rounded-full bg-white/20 cursor-pointer group">
            {/* Buffered */}
            <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${bufferedPct}%` }} />
            {/* Played */}
            <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${progress}%` }} />
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full -ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* Left controls */}
            <div className="flex items-center gap-2">
              <button onClick={togglePlay} className="text-white hover:text-white/80 w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                {playing ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
              </button>
              <button onClick={() => skip(-10)} className="text-white hover:text-white/80 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={() => skip(10)} className="text-white hover:text-white/80 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                <SkipForward className="w-4 h-4" />
              </button>
              <span className="text-white text-xs font-mono tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              {/* Volume */}
              <div className="flex items-center gap-1.5">
                <button onClick={toggleMute} className="text-white hover:text-white/80 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                  {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 accent-primary cursor-pointer hidden sm:block"
                />
              </div>
              <button onClick={toggleFullscreen} className="text-white hover:text-white/80 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Centre play/pause flash */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button
            className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center pointer-events-auto hover:bg-black/70 transition-colors"
            onClick={togglePlay}
          >
            <Play className="w-7 h-7 fill-white text-white ml-1" />
          </button>
        </div>
      )}
    </div>
  );
}