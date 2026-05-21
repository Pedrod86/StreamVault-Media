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
  if (/TV|SmartTV|SMART-TV|AndroidTV|Tizen|WebOS|BRAVIA|Roku|FireTV|Fire TV/i.test(ua)) return true;
  // Wide screen with coarse pointer (remote/gamepad)
  const wide = window.matchMedia('(min-width: 1280px)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  return wide && coarse && noHover;
}