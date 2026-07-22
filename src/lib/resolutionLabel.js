/**
 * Derive a short resolution label (e.g. "4K", "1080p", "720p", "SD") from a
 * video stream's pixel dimensions. Returns undefined when no usable value.
 *
 * Height is the reliable signal for the common broadcast resolutions; width is
 * used as a fallback (and to catch ultra-wide/DCI 4K where height < 2160).
 */
export function resolutionLabel(height, width) {
  const h = Number(height) || 0;
  const w = Number(width) || 0;
  if (!h && !w) return undefined;

  if (h >= 4320 || w >= 7680) return '8K';
  if (h >= 2000 || w >= 3800) return '4K';
  if (h >= 1400 || w >= 2400) return '1440p';
  if (h >= 1000 || w >= 1800) return '1080p';
  if (h >= 700 || w >= 1200) return '720p';
  if (h >= 550 || w >= 900) return '576p';
  if (h > 0) return 'SD';
  return undefined;
}