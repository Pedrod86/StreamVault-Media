import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Key, Loader2, ExternalLink, Info, Sparkles, AlertTriangle } from 'lucide-react';

export const PREMIUMIZE = {
  id: 'premiumize',
  name: 'Premiumize',
  color: 'from-cyan-500 to-sky-600',
  bg: 'bg-cyan-500/10 border-cyan-500/30',
  text: 'text-cyan-300',
  description: 'Scrape & stream cached torrents via Premiumize',
};

export default function PremiumizeForm({ onBack, onSave, isSaving }) {
  const [apiKey, setApiKey] = useState('');
  const [accountName, setAccountName] = useState('');
  const [error, setError] = useState('');
  const [warned, setWarned] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setWarned(false);
    const token = apiKey.trim();
    if (!token) { setError('Enter your Premiumize API key.'); return; }

    try {
      const res = await fetch('https://premiumize.me/api/account/info?apikey=' + encodeURIComponent(token), {
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401 || json?.status === 'error') {
        setError('Invalid API key. Copy it from premiumize.me/account → API Key.');
        return;
      }
      if (!res.ok || json.status !== 'success') {
        throw new Error((json && json.message) || ('HTTP ' + res.status));
      }
    } catch {
      setWarned(true);
    }

    onSave({
      server_url: 'https://premiumize.me',
      api_token: token,
      server_name: accountName || 'My Premiumize',
      auth_method: 'api_key',
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl text-foreground">Connect to Premiumize</h1>
              <p className="text-muted-foreground text-xs">Auto-stream torrents when your servers don't have it</p>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 mb-5 space-y-1">
          <p className="font-semibold flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> How to get your API key</p>
          <ol className="list-decimal list-inside space-y-0.5 text-cyan-300/80">
            <li>Open <a href="https://premiumize.me/account" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">premiumize.me <ExternalLink className="w-2.5 h-2.5" /></a></li>
            <li>Go to <span className="font-medium">Account → API Key</span></li>
            <li>Copy the key and paste it below</li>
          </ol>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-foreground text-sm">Account Name (optional)</Label>
            <Input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="My Premiumize"
              className="mt-1 bg-secondary border-border h-11"
            />
          </div>
          <div>
            <Label className="text-foreground text-sm flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-muted-foreground" /> Premiumize API Key
            </Label>
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your Premiumize API key..."
              className="mt-1 bg-secondary border-border h-11 font-mono text-sm"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Used to scrape & unlock cached torrents for instant streaming.</p>
          </div>

          {warned && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 leading-relaxed">
              <p className="font-semibold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Saved — couldn't verify the key</p>
              <p>We couldn't reach Premiumize to verify your key (network blocked the check). Your details were saved; streaming will reveal any real auth errors.</p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive leading-relaxed">
              <p className="font-semibold mb-1">Connection failed</p>
              <p>{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-sky-600 text-white border-0"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect Premiumize'}
          </Button>
        </form>
      </div>
    </div>
  );
}