import { useState, useEffect } from 'react';

/**
 * Detects if the app is running on an Android TV / Fire TV style device.
 * Heuristic: wide screen (≥1280px) + no fine pointer (no mouse), or
 * user agent contains "TV" keywords.
 */
export function useTvDevice() {
  const [isTV, setIsTV] = useState(() => detectTV());
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const handler = () => setIsTV(detectTV());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isTV;
}

function detectTV() {
  const ua = navigator.userAgent || '';
  // Extended UA detection including Android TV WebView patterns
  if (/TV|SmartTV|SMART-TV|AndroidTV|Android TV|Tizen|WebOS|BRAVIA|Roku|FireTV|Fire TV|AmazonFireOS|AFTT|AFTB|AFTM|AFTS|CrKey|Chromecast/i.test(ua)) return true;
  // Android TV often reports a landscape tablet-like UA — catch wide Android screens with no fine pointer
  const isAndroid = /Android/i.test(ua);
  const wide = window.matchMedia('(min-width: 1280px)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  if (isAndroid && wide) return true; // Android on a 1280px+ screen = very likely TV
  return wide && coarse && noHover;
}