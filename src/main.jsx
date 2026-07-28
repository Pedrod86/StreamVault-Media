import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import ErrorBoundary from '@/components/ErrorBoundary'
import '@/index.css'

// Android TV D-pad navigation: keep the focused interactive element on-screen
// as the user moves focus with arrow keys, so it never scrolls out of view.
if (typeof window !== 'undefined') {
  const INTERACTIVE = 'a, button, [tabindex], [role="button"], [role="tab"], [role="option"], [role="menuitem"], [role="checkbox"], [role="radio"], [role="switch"], .tv-focusable, [data-tv-focusable]';
  window.addEventListener('focusin', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return;
    if (!el.matches(INTERACTIVE)) return;
    requestAnimationFrame(() => {
      try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); } catch (e) {}
    });
  }, true);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)