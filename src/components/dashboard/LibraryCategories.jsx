import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Tv2, Sparkles, Baby } from 'lucide-react';

const IS_4K = (m) =>
  m.tags?.some(t => /4k|2160p|uhd/i.test(t)) ||
  m.title?.match(/\b(4K|UHD|2160p)\b/i);

const IS_KIDS = (m) =>
  m.tags?.some(t => /kids?|children|family|animated/i.test(t)) ||
  m.genre?.some(g => /kids?|children|family|animation/i.test(g)) ||
  ['TV-Y', 'TV-G', 'G'].includes(m.content_rating);

const CATEGORIES = [
  {
    key: 'movies',
    label: 'Movies',
    icon: Film,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    href: '/movies',
    filter: (m) => m.media_type === 'movie' && !IS_4K(m),
  },
  {
    key: 'shows',
    label: 'TV Shows',
    icon: Tv2,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
    href: '/shows',
    filter: (m) => m.media_type === 'tv_show' && !IS_4K(m),
  },
  {
    key: '4k-movies',
    label: '4K Movies',
    icon: Film,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/20',
    href: '/movies',
    filter: (m) => m.media_type === 'movie' && IS_4K(m),
    badge: '4K',
  },
  {
    key: '4k-shows',
    label: '4K TV Shows',
    icon: Tv2,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
    href: '/shows',
    filter: (m) => m.media_type === 'tv_show' && IS_4K(m),
    badge: '4K',
  },
  {
    key: 'kids',
    label: "Kids TV",
    icon: Baby,
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
    border: 'border-pink-400/20',
    href: '/shows',
    filter: (m) => IS_KIDS(m),
  },
];

export default function LibraryCategories({ allMedia = [] }) {
  if (!allMedia.length) return null;

  return (
    <div className="px-4 sm:px-6 mt-6">
      <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
        Library
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {CATEGORIES.map(({ key, label, icon: Icon, color, bg, border, href, filter, badge }) => {
          const count = allMedia.filter(filter).length;
          return (
            <Link
              key={key}
              to={href}
              className={`relative flex flex-col gap-2 p-4 rounded-xl bg-card border ${border} hover:border-opacity-60 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}
            >
              {badge && (
                <span className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${bg} ${color}`}>
                  {badge}
                </span>
              )}
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className={`font-heading font-bold text-xl leading-none ${color}`}>{count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-tight">{label}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}