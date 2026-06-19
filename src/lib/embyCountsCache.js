// Caches the last-known Emby category counts so the homepage boxes can be
// filled instantly on load, then updated live as a fresh scan brings in content.

const KEY = 'streamvault_emby_counts';

export function loadCounts() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export function saveCounts(counts) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...counts, savedAt: Date.now() }));
  } catch (_) {}
}