import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Announces the currently playing title to Discord (via the configured webhook)
// when playback starts, and posts a "stopped watching" note when it ends.
export function useDiscordNowWatching({ title, poster, mediaType, year, subtitle }) {
  const announced = useRef(null);

  useEffect(() => {
    if (!title || announced.current === title) return;
    announced.current = title;

    const payload = {
      title,
      poster_url: poster,
      media_type: mediaType,
      year,
      subtitle,
    };

    base44.functions.invoke('discordNowWatching', { action: 'start', ...payload }).catch(() => {});

    return () => {
      base44.functions.invoke('discordNowWatching', { action: 'stop', ...payload }).catch(() => {});
      announced.current = null;
    };
  }, [title, poster, mediaType, year, subtitle]);
}