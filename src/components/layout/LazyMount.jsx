import React, { useState, useRef, useEffect } from 'react';

/**
 * Defers mounting its children until the placeholder scrolls near the viewport.
 * This keeps the Home page snappy: each heavy media row only fires its data
 * fetch once the user scrolls to it, instead of all rows fetching at once on
 * load (which was slow and could time out).
 *
 * `rootMargin` pre-loads a little before the row is actually visible so content
 * is usually ready by the time it scrolls in.
 */
export default function LazyMount({ children, minHeight = 260, rootMargin = '600px' }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver (very old WebView) — just render immediately.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  if (visible) return children;

  return <div ref={ref} style={{ minHeight }} aria-hidden="true" />;
}