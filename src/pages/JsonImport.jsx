import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Link2, Loader2, CheckCircle2, FileJson } from 'lucide-react';
import { parseProviderJson } from '@/lib/jsonMediaMapper';
import JsonImportPreview from '@/components/media/JsonImportPreview';

export default function JsonImport() {
  const [items, setItems] = useState([]);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [imported, setImported] = useState(0);

  const load = (json) => {
    const mapped = parseProviderJson(json);
    if (!mapped.length) {
      setError('No movie or TV titles could be read from that JSON.');
      setItems([]);
      return;
    }
    setError('');
    setImported(0);
    setItems(mapped);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError('');
    try {
      load(JSON.parse(await file.text()));
    } catch {
      setError('That file is not valid JSON.');
    }
    setBusy(false);
  };

  const handleUrl = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await base44.functions.invoke('mediaProxy', { url: url.trim() }).catch(() => null);
    const data = res?.data?.data;
    if (!res?.data?.ok || !data) setError('Could not fetch JSON from that URL.');
    else load(typeof data === 'string' ? JSON.parse(data) : data);
    setBusy(false);
  };

  const handleImport = async () => {
    setBusy(true);
    const BATCH = 100;
    for (let i = 0; i < items.length; i += BATCH) {
      await base44.entities.Media.bulkCreate(items.slice(i, i + BATCH));
      setImported(Math.min(i + BATCH, items.length));
    }
    setBusy(false);
    setItems([]);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-24">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
          <FileJson className="w-6 h-6 text-primary" /> Import JSON
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Add movies & TV titles from a provider's JSON file or link.</p>
      </div>

      <div className="p-4 rounded-xl border border-border space-y-2">
        <Label className="text-sm text-foreground flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Upload a .json file</Label>
        <Input type="file" accept=".json,application/json" onChange={handleFile} className="bg-secondary border-border" />
      </div>

      <form onSubmit={handleUrl} className="p-4 rounded-xl border border-border space-y-2">
        <Label className="text-sm text-foreground flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Or paste a JSON URL</Label>
        <div className="flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://provider.example.com/list.json" className="bg-secondary border-border font-mono text-sm" />
          <Button type="submit" disabled={!url.trim() || busy} className="shrink-0">Fetch</Button>
        </div>
      </form>

      {busy && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Working…</p>}

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">{error}</div>
      )}

      {imported > 0 && !items.length && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Added {imported} titles to your library.
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          <JsonImportPreview items={items} />
          <Button onClick={handleImport} disabled={busy} className="w-full h-11 rounded-xl font-semibold">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Add ${items.length} titles to library`}
          </Button>
        </div>
      )}
    </div>
  );
}