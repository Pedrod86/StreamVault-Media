import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { X, Layers, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';
import PlayerPicker, { PLAYERS } from './PlayerPicker';
import ExternalPlayerView from './ExternalPlayerView';

export default function EmbyVideoPlayer({ item, server, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [playerId, setPlayerId] = useState('hls');
  const [showPicker, setShowPicker] = useState(false);
  const [muted, setMuted] = useState(false);
  const [codecLabel, setCodecLabel] = useState('');

  const base = server?.server_url?.replace(/\/$/, '') || '';
  const token = server?.api_token || '';

  const hlsUrl = `${base}/Videos/${item.id}/master.m3u8?api_key=${token}&VideoCodec=h264,hevc,av1,vp9&AudioCodec=aac,mp3,ac3,eac3,flac,opus&SubtitleMethod=Encode&TranscodingMaxAudioChannels=2&RequireAvc=false&EnableAdaptiveBitrateStreaming=true`;
  const directUrl = `${base}/Videos/${item.id}/stream?api_key=${token}&Static=true`;

  useEffect(() => {
    if (['vlc', 'infuse', 'mx'].includes(playerId)) return;
    const video = videoRef.current;
    if (!video) return;

    // Cleanup previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (playerId === 'direct') {
      video.src = directUrl;
      video.play().catch(() => {});
      return;
    }

    // HLS mode
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.FRAG_PARSED, (_e, data) => {
        const codec = data?.frag?.levelCodec || '';
        if (codec.includes('hev') || codec.includes('hvc')) setCodecLabel('HEVC');
        else if (codec.includes('av01')) setCodecLabel('AV1');
        else if (codec.includes('vp09')) setCodecLabel('VP9');
        else if (codec.includes('avc') || codec.includes('h264')) setCodecLabel('H264');
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = hlsUrl;
      video.play().catch(() => {});
    } else {
      // Fallback to direct
      video.src = directUrl;
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playerId, hlsUrl, directUrl]);

  // External player view
  if (['vlc', 'infuse', 'mx'].includes(playerId)) {
    return (
      <ExternalPlayerView
        item={item}
        server={server}
        playerId={playerId}
        onClose={onClose}
        onSwitchPlayer={setPlayerId}
      />
    );
  }

  const playerLabel = PLAYERS.find(p => p.id === playerId)?.label || 'HLS';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-white/80 text-sm font-medium truncate max-w-[200px]">{item.title}</span>
          {codecLabel && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/60">{codecLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => { if (videoRef.current) { videoRef.current.muted = !videoRef.current.muted; setMuted(v => !v); } }}
            className="text-white/70 hover:text-white transition-colors"
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            onClick={() => videoRef.current?.requestFullscreen?.()}
            className="text-white/70 hover:text-white transition-colors"
          >
            <Maximize className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowPicker(p => !p)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" /> {playerLabel}
          </button>
          {showPicker && (
            <PlayerPicker
              current={playerId}
              onChange={(p) => { setPlayerId(p); setShowPicker(false); }}
              onClose={() => setShowPicker(false)}
            />
          )}
        </div>
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        autoPlay
        playsInline
        muted={muted}
      />
    </div>
  );
}