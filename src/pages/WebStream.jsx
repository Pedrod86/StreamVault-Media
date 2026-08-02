import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Globe, Search, Loader2, AlertCircle } from 'lucide-react';
import ShakaPlayer from '@/components/media/ShakaPlayer';
import FreeStreamPlayer from '@/components/media/FreeStreamPlayer';
import WebStreamResult from '@/components/media/WebStreamResult';

export default function WebStream() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [playing, setPlaying] = useState(null); // { url, kind, label }

  const scrape = async (e) => {
    e?.preventDefault();
    const target = url.trim();
    if (!target) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await base44.functions.invoke('webScrape', {
        url: /^https?:\/\//i.test(target) ? target : `https://${target}`,
      });
      if (res.data?.error) setError(res.data.error);
      else setResult(res.data);
    } catch (err) {
      setError(err?.message || 'Scrape failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" /> Web Streams
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Paste any page or direct media link — StreamVault scans it for playable video and streams it here.
        </p>
      </div>

      <form onSubmit={scrape} className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/watch/… or a direct .m3u8 / .mp4 link"
          className="h-11 bg-background border-border"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <Button type="submit" className="h-11 px-5 gap-2 shrink-0" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Scan
        </Button>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">{result.pageTitle}</span> — {result.streams.length} source{result.streams.length === 1 ? '' : 's'} found
          </p>
          {result.streams.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No playable video found on that page.
            </p>
          )}
          {result.streams.map((s) => (
            <WebStreamResult key={s.url} stream={s} onPlay={() => setPlaying(s)} />
          ))}
        </div>
      )}

      {playing && playing.kind === 'embed' && (
        <FreeStreamPlayer
          title={playing.label}
          embedUrl={playing.url}
          watchUrl={playing.url}
          onClose={() => setPlaying(null)}
        />
      )}
      {playing && playing.kind !== 'embed' && (
        <ShakaPlayer src={playing.url} title={playing.label} onClose={() => setPlaying(null)} />
      )}
    </div>
  );
}