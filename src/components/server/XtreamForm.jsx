import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Globe, User, Key, Loader2, Tv2 } from 'lucide-react';

export const XTREAM = {
  id: 'xtream',
  name: 'Xtream Codes',
  color: 'from-purple-500 to-indigo-600',
  bg: 'bg-purple-500/10 border-purple-500/30',
  text: 'text-purple-400',
  description: 'Connect your IPTV provider via Xtream Codes API',
};

export default function XtreamForm({ onBack, onSave, isSaving }) {
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [serverName, setServerName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Normalize URL
    let base = url.trim().replace(/\/$/, '');
    if (!/^https?:\/\//i.test(base)) base = 'http://' + base;

    // Validate credentials against the Xtream API
    const testUrl = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    let res;
    try {
      res = await fetch(testUrl);
    } catch {
      setError('Cannot reach the server. Check the URL and ensure it is reachable from your device.');
      return;
    }

    let data;
    try {
      data = await res.json();
    } catch {
      setError('Server returned an unexpected response. Make sure this is a valid Xtream Codes server URL.');
      return;
    }

    if (!data?.user_info || data.user_info.auth === 0) {
      setError('Authentication failed. Check your username and password.');
      return;
    }

    onSave({
      server_url: base,
      username,
      password,
      server_name: serverName || data.server_info?.server_protocol
        ? (serverName || 'My IPTV Provider')
        : (serverName || 'My IPTV Provider'),
      auth_method: 'credentials',
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Tv2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl text-foreground">Connect IPTV Provider</h1>
              <p className="text-muted-foreground text-xs">Xtream Codes API login</p>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 mb-5 space-y-1">
          <p className="font-semibold">What you need:</p>
          <ul className="list-disc list-inside space-y-0.5 text-purple-300/80">
            <li>Your IPTV provider's server URL (e.g. http://provider.com:8080)</li>
            <li>Your Xtream Codes username & password from your provider</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-foreground text-sm flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" /> Server URL
            </Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://provider.com:8080"
              className="mt-1 bg-secondary border-border h-11 font-mono text-sm"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Include port number if provided by your IPTV service</p>
          </div>

          <div>
            <Label className="text-foreground text-sm">Provider Name (optional)</Label>
            <Input
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="My IPTV Provider"
              className="mt-1 bg-secondary border-border h-11"
            />
          </div>

          <div>
            <Label className="text-foreground text-sm flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" /> Username
            </Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 bg-secondary border-border h-11"
              required
            />
          </div>

          <div>
            <Label className="text-foreground text-sm flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-muted-foreground" /> Password
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 bg-secondary border-border h-11"
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive leading-relaxed">
              <p className="font-semibold mb-1">Connection failed</p>
              <p>{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect IPTV Provider'}
          </Button>
        </form>
      </div>
    </div>
  );
}