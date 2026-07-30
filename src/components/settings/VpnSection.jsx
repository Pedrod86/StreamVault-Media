import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { Shield, Plus, Trash2, Plug, CheckCircle2, Copy, X, ChevronDown, ChevronUp, Download, ClipboardPaste } from 'lucide-react';

const EMPTY = {
  provider_name: '',
  endpoint_host: '',
  endpoint_port: 51820,
  address: '',
  allowed_ips: '0.0.0.0/0, ::/0',
  dns: '',
  private_key: '',
  public_key: '',
  pre_shared_key: '',
  username: '',
  password: '',
};

// Build a standard WireGuard .conf from a stored server entry.
function buildConfig(s) {
  const ep = `${s.endpoint_host}${s.endpoint_port ? `:${s.endpoint_port}` : ''}`;
  let out = '[Interface]\n';
  if (s.private_key) out += `PrivateKey = ${s.private_key}\n`;
  if (s.address) out += `Address = ${s.address}\n`;
  if (s.dns) out += `DNS = ${s.dns}\n`;
  out += '\n[Peer]\n';
  if (s.public_key) out += `PublicKey = ${s.public_key}\n`;
  if (s.pre_shared_key) out += `PresharedKey = ${s.pre_shared_key}\n`;
  out += `Endpoint = ${ep}\n`;
  out += `AllowedIPs = ${s.allowed_ips || '0.0.0.0/0, ::/0'}\n`;
  out += 'PersistentKeepalive = 25\n';
  return out;
}

// Parse a pasted WireGuard .conf into our form fields. Keys are globally unique
// across [Interface]/[Peer], so a simple key=value match is enough.
function parseConf(text) {
  const get = (key) => {
    const m = text.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, 'mi'));
    return m ? m[1].trim() : '';
  };
  const endpoint = get('Endpoint');
  let endpoint_host = endpoint, endpoint_port = 51820;
  if (endpoint.includes(':')) {
    const [h, p] = endpoint.split(':');
    endpoint_host = h;
    const n = Number(p);
    if (n) endpoint_port = n;
  }
  return {
    private_key: get('PrivateKey'),
    address: get('Address'),
    dns: get('DNS'),
    public_key: get('PublicKey'),
    pre_shared_key: get('PresharedKey'),
    allowed_ips: get('AllowedIPs') || '0.0.0.0/0, ::/0',
    endpoint_host,
    endpoint_port,
  };
}

function downloadConf(s) {
  const blob = new Blob([buildConfig(s)], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe = (s.provider_name || 'wireguard').replace(/[^a-z0-9-_]+/gi, '_');
  a.href = url;
  a.download = `${safe}.conf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

export default function VpnSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [adding, setAdding] = useState(false);
  const [ errorMsg, setErrorMsg] = useState('');
  const [expanded, setExpanded] = useState(null); // server id whose config is open
  const [copiedId, setCopiedId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [confText, setConfText] = useState('');
  const [importMsg, setImportMsg] = useState('');

  const { data: servers = [], isLoading } = useQuery({
    queryKey: ['vpnServers'],
    queryFn: () => base44.entities.VpnServer.list('-created_date'),
  });

  const activeServer = servers.find(s => s.is_active) || null;

  const createMutation = useMutation({
    mutationFn: async (payload) => base44.entities.VpnServer.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vpnServers'] });
      setForm(EMPTY);
      setAdding(false);
      setErrorMsg('');
    },
    onError: (e) => setErrorMsg(e?.message || 'Could not save the server.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => base44.entities.VpnServer.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vpnServers'] }),
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fillFromConf = () => {
    if (!confText.trim()) {
      setImportMsg('Paste a WireGuard config first.');
      return;
    }
    const parsed = parseConf(confText);
    if (!parsed.endpoint_host) {
      setImportMsg('Could not find an Endpoint in that config — check the format.');
      return;
    }
    setForm(f => ({ ...f, ...parsed }));
    setShowImport(false);
    setConfText('');
    setImportMsg('');
  };

  const handleConnect = async (id) => {
    // Clear any currently-active server, then mark this one as active.
    await base44.entities.VpnServer.updateMany({ is_active: true }, { $set: { is_active: false } });
    await base44.entities.VpnServer.update(id, { is_active: true });
    queryClient.invalidateQueries({ queryKey: ['vpnServers'] });
  };

  const handleDisconnect = async (id) => {
    await base44.entities.VpnServer.update(id, { is_active: false });
    queryClient.invalidateQueries({ queryKey: ['vpnServers'] });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.provider_name || !form.endpoint_host) {
      setErrorMsg('Server name and endpoint host are required.');
      return;
    }
    createMutation.mutate({
      ...form,
      endpoint_port: Number(form.endpoint_port) || 51820,
    });
  };

  const copyConfig = async (s) => {
    try {
      await navigator.clipboard.writeText(buildConfig(s));
      setCopiedId(s.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="space-y-4 p-5 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-4 h-4 text-primary" />
        <h2 className="font-heading font-semibold text-foreground">VPN (WireGuard)</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Save your WireGuard credentials and server endpoints. Pick a server and Connect to mark it as your active one. No system tunnel is opened from here — use your device's VPN app with the copied config.
      </p>

      {/* Active status */}
      {activeServer ? (
        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Connected to <strong>{activeServer.provider_name}</strong></span>
        </div>
      ) : !isLoading && servers.length > 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary rounded-lg px-3 py-2">
          <X className="w-4 h-4 shrink-0" />
          <span>No active server — pick one below and Connect.</span>
        </div>
      ) : null}

      {/* Server list */}
      {!isLoading && servers.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground py-2">No VPN servers saved yet. Add one to get started.</p>
      )}

      <div className="space-y-3">
        {servers.map(s => (
          <div key={s.id} className={`rounded-xl border p-3 space-y-2 ${s.is_active ? 'border-green-500/50 bg-green-500/5' : 'border-border bg-secondary/40'}`}>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{s.provider_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {s.endpoint_host}{s.endpoint_port ? `:${s.endpoint_port}` : ''} {s.username ? `· ${s.username}` : ''}
                </p>
              </div>
              {s.is_active ? (
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-green-500/50 text-green-400 gap-1.5" onClick={() => handleDisconnect(s.id)}>
                  <X className="w-3.5 h-3.5" /> Disconnect
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-primary/40 text-primary hover:bg-primary/10 gap-1.5" onClick={() => handleConnect(s.id)}>
                  <Plug className="w-3.5 h-3.5" /> Connect
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setExpanded(expanded === s.id ? null : s.id)} aria-label="Toggle config">
                {expanded === s.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutate(s.id)} aria-label="Delete server">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {expanded === s.id && (
              <div className="space-y-2 pt-1">
                <Textarea readOnly value={buildConfig(s)} className="font-mono text-xs bg-background border-border min-h-[160px]" />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => copyConfig(s)}>
                    {copiedId === s.id ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => downloadConf(s)}>
                    <Download className="w-3.5 h-3.5" /> Download .conf
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add form */}
      {adding ? (
        <form onSubmit={handleSave} className="space-y-3 rounded-xl border border-border p-4 bg-secondary/30">
          {/* Paste-import a WireGuard .conf and auto-fill the technical fields */}
          {!showImport ? (
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10" onClick={() => setShowImport(true)}>
              <ClipboardPaste className="w-3.5 h-3.5" /> Paste WireGuard config
            </Button>
          ) : (
            <div className="space-y-2 rounded-lg border border-border p-3 bg-background/50">
              <Textarea
                value={confText}
                onChange={e => setConfText(e.target.value)}
                placeholder={'[Interface]\nPrivateKey = ...\nAddress = ...\nDNS = ...\n\n[Peer]\nPublicKey = ...\nEndpoint = vpn.example.com:51820\nAllowedIPs = 0.0.0.0/0, ::/0'}
                className="font-mono text-xs bg-background border-border min-h-[120px]"
              />
              {importMsg && <p className="text-xs text-destructive">{importMsg}</p>}
              <div className="flex gap-2">
                <Button type="button" size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 gap-1.5" onClick={fillFromConf}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Fill fields from config
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowImport(false); setConfText(''); setImportMsg(''); }}>Cancel</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Past config auto-fills Endpoint, keys, Address, DNS and AllowedIPs. You still set a name + your shop credentials below.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Server name *">
              <Input value={form.provider_name} onChange={e => set('provider_name', e.target.value)} className="bg-background border-border h-10" placeholder="London - WireGuard" />
            </Field>
            <Field label="Endpoint host *">
              <Input value={form.endpoint_host} onChange={e => set('endpoint_host', e.target.value)} className="bg-background border-border h-10" placeholder="vpn.example.com" />
            </Field>
            <Field label="Endpoint port">
              <Input type="number" value={form.endpoint_port} onChange={e => set('endpoint_port', e.target.value)} className="bg-background border-border h-10" placeholder="51820" />
            </Field>
            <Field label="Address (tunnel IP)">
              <Input value={form.address} onChange={e => set('address', e.target.value)} className="bg-background border-border h-10" placeholder="10.0.0.2/32" />
            </Field>
            <Field label="DNS">
              <Input value={form.dns} onChange={e => set('dns', e.target.value)} className="bg-background border-border h-10" placeholder="1.1.1.1, 1.0.0.1" />
            </Field>
            <Field label="AllowedIPs">
              <Input value={form.allowed_ips} onChange={e => set('allowed_ips', e.target.value)} className="bg-background border-border h-10" />
            </Field>
            <Field label="Server public key">
              <Input value={form.public_key} onChange={e => set('public_key', e.target.value)} className="bg-background border-border h-10" placeholder="Peer PublicKey" />
            </Field>
            <Field label="Pre-shared key (optional)">
              <Input value={form.pre_shared_key} onChange={e => set('pre_shared_key', e.target.value)} className="bg-background border-border h-10" />
            </Field>
          </div>
          <Field label="Your private key">
            <Input value={form.private_key} onChange={e => set('private_key', e.target.value)} className="bg-background border-border h-10 font-mono" placeholder="Interface PrivateKey" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Username (shop account)">
              <Input value={form.username} onChange={e => set('username', e.target.value)} className="bg-background border-border h-10" placeholder="Your VPN shop username" autoComplete="off" />
            </Field>
            <Field label="Password (shop account)">
              <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} className="bg-background border-border h-10" autoComplete="new-password" />
            </Field>
          </div>

          {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="submit" className="h-10 rounded-xl font-semibold bg-primary hover:bg-primary/90 gap-2" disabled={createMutation.isPending}>
              <Plus className="w-4 h-4" /> Add Server
            </Button>
            <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => { setAdding(false); setForm(EMPTY); setErrorMsg(''); }}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" className="w-full h-10 border-primary/40 text-primary hover:bg-primary/10 gap-2" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4" /> Add VPN Server
        </Button>
      )}
    </motion.section>
  );
}