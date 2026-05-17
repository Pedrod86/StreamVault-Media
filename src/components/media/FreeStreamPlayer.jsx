import React, { useState } from 'react';
import { X, ExternalLink, AlertTriangle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Converts any YouTube URL to a youtube-nocookie embed URL for better iframe compatibility.
 */
function toNocookieEmbed(url) {
  if (!url) return url;
  // Already an embed URL — swap domain
  const nocookie = url
    .replace('youtube.com/embed/', 'youtube-nocookie.com/embed/')
    .replace('www.youtube.com/embed/', 'youtube-nocookie.com/embed/');
  // Ensure autoplay param
  if (nocookie.includes('youtube-nocookie.com/embed/')) {
    return nocookie.includes('?')
      ? nocookie + '&autoplay=1&rel=0'
      : nocookie + '?autoplay=1&rel=0';
  }
  return url;
}

export default function FreeStreamPlayer({ title, embedUrl, watchUrl, onClose }) {
  const [loadError, setLoadError] = useState(false);
  const processedUrl = toNocookieEmbed(embedUrl);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/80 backdrop-blur shrink-0">
        <h2 className="text-sm font-semibold text-white truncate max-w-[60vw]">{title}</h2>
        <div className="flex items-center gap-2">
          {watchUrl && (
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-white transition-colors"
              title="Open in original site"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-white h-8 w-8"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Player area */}
      <div className="flex-1 relative bg-black">
        {loadError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
            <AlertTriangle className="w-10 h-10 text-amber-400" />
            <div>
              <p className="text-white font-semibold mb-1">Can't play inside the app</p>
              <p className="text-muted-foreground text-sm mb-4">
                This video cannot be embedded due to the provider's restrictions.
              </p>
            </div>
            {watchUrl && (
              <a href={watchUrl} target="_blank" rel="noopener noreferrer">
                <Button className="gap-2">
                  <Play className="w-4 h-4" fill="currentColor" /> Watch on {watchUrl.includes('youtube') ? 'YouTube' : 'Original Site'}
                </Button>
              </a>
            )}
          </div>
        ) : (
          <iframe
            key={processedUrl}
            src={processedUrl}
            title={title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            frameBorder="0"
            onError={() => setLoadError(true)}
          />
        )}
      </div>
    </div>
  );
}