import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Library, Server, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UnifiedLibraryGrid from '@/components/media/UnifiedLibraryGrid';

const flatten = (data, source, serverId) =>
  (data?.views || []).flatMap(v =>
    (v.items || []).map(i => ({ ...i, source, serverId, view: v.name }))
  );

export default function ServerLibraries() {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  const { data: servers = [] } = useQuery({
    queryKey: ['mediaServers'],
    queryFn: () => base44.entities.MediaServer.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });
  const embyServer = servers.find(s => s.server_type === 'emby' && s.is_active !== false);
  const plexServer = servers.find(s => s.server_type === 'plex' && s.is_active !== false);

  const emby = useQuery({
    queryKey: ['embyViews', embyServer?.id || 'default'],
    queryFn: () => base44.functions.invoke('embyViews', { serverId: embyServer.id }).then(r => r.data),
    enabled: !!embyServer,
    staleTime: 5 * 60 * 1000,
  });
  const plex = useQuery({
    queryKey: ['plexViews'],
    queryFn: () => base44.functions.invoke('plexViews', {}).then(r => r.data),
    enabled: !!plexServer,
    staleTime: 5 * 60 * 1000,
  });

  const items = useMemo(() => {
    let all = [
      ...(tab === 'plex' ? [] : flatten(emby.data, 'emby', embyServer?.id)),
      ...(tab === 'emby' ? [] : flatten(plex.data, 'plex')),
    ];
    if (search.trim()) {
      const q = search.toLowerCase();
      all = all.filter(i => i.title?.toLowerCase().includes(q));
    }
    return all.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }, [emby.data, plex.data, tab, search, embyServer?.id]);

  const loading = (embyServer && emby.isLoading) || (plexServer && plex.isLoading);

  const tabs = [
    { id: 'all', label: 'All' },
    ...(embyServer ? [{ id: 'emby', label: embyServer.server_name || 'Emby' }] : []),
    ...(plexServer ? [{ id: 'plex', label: plexServer.server_name || 'Plex' }] : []),
  ];

  return (
    <div className="pt-16 pb-24">
      <div className="px-4 sm:px-6 pt-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Library className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg text-foreground">Unified Library</h1>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Loading…' : `${items.length.toLocaleString()} titles across Plex & Emby`}
            </p>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search titles…"
            className="pl-9 bg-secondary border-border rounded-xl" />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {tabs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!embyServer && !plexServer ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <Server className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-heading font-bold text-xl text-foreground">No servers connected</h2>
          <p className="text-sm text-muted-foreground max-w-sm">Connect Plex or Emby to browse their libraries here.</p>
          <Button asChild className="rounded-xl"><Link to="/connect-server">Connect a server</Link></Button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center min-h-[30vh] text-muted-foreground gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading libraries…
        </div>
      ) : items.length === 0 ? (
        <p className="px-4 sm:px-6 text-sm text-muted-foreground">No titles found.</p>
      ) : (
        <UnifiedLibraryGrid items={items} />
      )}
    </div>
  );
}