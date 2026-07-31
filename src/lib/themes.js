// Shared theme definitions + applier.
// `bg` (optional) recolours the whole background/surface palette, not just accents.
export const THEMES = [
  { label: '⚡ Cyberpunk',      primary: '300 100% 55%', accent: '57 100% 50%',  preview: ['#cc00ff', '#ffee00'], cyberpunk: true },
  { label: '🎬 Plex',          primary: '41 89% 48%',   accent: '38 95% 60%',   preview: ['#e5a00d', '#f5b942'], bg: { h: 0, s: 0 } },
  { label: '🌌 Blue',         primary: '217 91% 60%',  accent: '199 89% 55%',  preview: ['#3b82f6', '#22b8e6'], bg: { h: 222, s: 60 } },
  { label: '🟢 Green',         primary: '142 71% 45%',  accent: '160 84% 45%',  preview: ['#22c55e', '#12d39a'], bg: { h: 145, s: 30 } },
];

export function applyTheme(primary, accent, cyberpunk = false, bg = null, glass = false) {
  const root = document.documentElement;
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--ring', primary);
  root.style.setProperty('--chart-1', primary);
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--chart-2', accent);

  // Glass mode toggle — frosted surfaces + glass-effect text (styled in index.css).
  root.classList.toggle('theme-glass', !!glass);

  if (cyberpunk) {
    root.classList.add('theme-cyberpunk');
    root.style.setProperty('--background', '270 100% 3%');
    root.style.setProperty('--foreground', '57 100% 55%');
    root.style.setProperty('--card', '270 80% 6%');
    root.style.setProperty('--card-foreground', '57 100% 55%');
    root.style.setProperty('--popover', '270 80% 6%');
    root.style.setProperty('--popover-foreground', '57 100% 55%');
    root.style.setProperty('--secondary', '270 60% 10%');
    root.style.setProperty('--secondary-foreground', '57 100% 65%');
    root.style.setProperty('--muted', '270 60% 10%');
    root.style.setProperty('--muted-foreground', '270 30% 55%');
    root.style.setProperty('--border', '300 80% 30%');
    root.style.setProperty('--input', '270 60% 10%');
    root.style.setProperty('--sidebar-background', '270 80% 6%');
    root.style.setProperty('--sidebar-foreground', '57 100% 55%');
    root.style.setProperty('--sidebar-primary', primary);
    root.style.setProperty('--sidebar-border', '300 80% 30%');
    root.style.setProperty('--primary-foreground', '270 100% 5%');
  } else {
    root.classList.remove('theme-cyberpunk');
    // Background hue/saturation — defaults to the classic dark navy when no bg palette is given.
    const h = bg?.h ?? 222;
    const s = bg?.oled ? 0 : (bg?.s ?? 30);
    // OLED uses pure-black surfaces; everything else scales lightness off the chosen hue/sat.
    const L = bg?.oled
      ? { bg: 0, card: 4, surface: 8, border: 14 }
      : { bg: 6, card: 9, surface: 14, border: 18 };
    const fg = '210 40% 96%';
    root.style.setProperty('--background', `${h} ${s}% ${L.bg}%`);
    root.style.setProperty('--foreground', fg);
    root.style.setProperty('--card', `${h} ${s}% ${L.card}%`);
    root.style.setProperty('--card-foreground', fg);
    root.style.setProperty('--popover', `${h} ${s}% ${L.card}%`);
    root.style.setProperty('--popover-foreground', fg);
    root.style.setProperty('--secondary', `${h} ${s}% ${L.surface}%`);
    root.style.setProperty('--secondary-foreground', fg);
    root.style.setProperty('--muted', `${h} ${s}% ${L.surface}%`);
    root.style.setProperty('--muted-foreground', '215 20% 55%');
    root.style.setProperty('--border', `${h} ${s}% ${L.border}%`);
    root.style.setProperty('--input', `${h} ${s}% ${L.border}%`);
    root.style.setProperty('--sidebar-background', `${h} ${s}% ${L.card}%`);
    root.style.setProperty('--sidebar-foreground', fg);
    root.style.setProperty('--sidebar-primary', primary);
    root.style.setProperty('--sidebar-border', `${h} ${s}% ${L.border}%`);
    root.style.setProperty('--primary-foreground', '210 40% 98%');
  }
}

// Restore a saved theme from AppSettings.
// Match by exact theme_label first (reliable), then fall back to accent_color for older saves.
export function applySavedTheme(settings) {
  if (!settings) return;
  const t = (settings.theme_label && THEMES.find(t => t.label === settings.theme_label))
    || (settings.accent_color && THEMES.find(t => t.primary === settings.accent_color));
  if (t) {
    applyTheme(t.primary, t.accent, !!t.cyberpunk, t.bg, !!t.glass);
  } else {
    // Custom/legacy values not in the preset list — apply accents only.
    const root = document.documentElement;
    root.style.setProperty('--primary', settings.accent_color);
    root.style.setProperty('--ring', settings.accent_color);
    root.style.setProperty('--chart-1', settings.accent_color);
    if (settings.secondary_color) {
      root.style.setProperty('--accent', settings.secondary_color);
      root.style.setProperty('--chart-2', settings.secondary_color);
    }
  }
}