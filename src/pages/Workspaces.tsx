import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, errMsg, logActivity } from '../lib/api';
import type { Category, Member, Workspace, WorkspaceSub } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { ROLE_LABEL, slugify } from '../lib/utils';
import { Badge, Empty, ErrorBox, Field, Modal, Spinner, useUI } from '../components/ui';

export default function Workspaces() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { toast } = useUI();
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ name: '', description: '', logoUrl: '', brandColor: '#4f46e5', publicRoadmap: true });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    const members = await api.list<Member>('workspaceMembers', { userId: user!.id });
    const all = await api.list<Workspace>('workspaces');
    return members.map((m) => ({ m, ws: all.find((w) => w.id === m.workspaceId)! })).filter((x) => x.ws);
  }, [user?.id]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 3) er.name = 'Name must be at least 3 characters';
    if (f.logoUrl && !/^https?:\/\//.test(f.logoUrl)) er.logoUrl = 'Logo must be a valid http(s) URL';
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      let slug = slugify(f.name);
      const clash = await api.list<Workspace>('workspaces', { slug });
      if (clash.length) slug += '-' + Date.now().toString(36).slice(-4);
      const ws = await api.create<Workspace>('workspaces', { ...f, name: f.name.trim(), slug, createdAt: new Date().toISOString() });
      await Promise.all([
        api.create<Member>('workspaceMembers', { workspaceId: ws.id, userId: user!.id, role: 'owner', status: 'active' }),
        api.create<WorkspaceSub>('workspaceSubscriptions', { workspaceId: ws.id, planId: 'free' }),
        api.create<Category>('categories', { workspaceId: ws.id, name: 'General', color: '#6366f1' }),
      ]);
      await logActivity(ws.id, user!.id, 'created workspace');
      toast('Workspace created');
      nav(`/w/${ws.id}`);
    } catch (x) { toast(errMsg(x), 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Your workspaces</h1><p className="text-sm text-slate-500">Signed in as {user?.name}</p></div>
        <div className="flex gap-2"><button className="btn-primary" onClick={() => setCreating(true)}>+ New workspace</button><button className="btn-ghost" onClick={logout}>Log out</button></div>
      </div>
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data?.length ? (
        <Empty title="No workspaces yet" hint="Create your first workspace to start collecting feedback." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map(({ m, ws }) => (
            <Link key={ws.id} to={`/w/${ws.id}`} className="card block transition hover:shadow-md" style={{ borderTop: `4px solid ${ws.brandColor}` }}>
              <div className="flex items-start justify-between gap-2"><h2 className="font-semibold">{ws.name}</h2><Badge className="bg-slate-100 text-slate-700">{ROLE_LABEL[m.role]}</Badge></div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{ws.description || 'No description'}</p>
              {m.status !== 'active' && <Badge className="mt-2 bg-amber-100 text-amber-800">{m.status}</Badge>}
            </Link>
          ))}
        </div>
      )}
      {creating && (
        <Modal title="Create workspace" onClose={() => setCreating(false)}>
          <form onSubmit={create} noValidate>
            <Field label="Name *" error={err.name}><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Description"><textarea className="input" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
            <Field label="Logo URL" error={err.logoUrl}><input className="input" value={f.logoUrl} onChange={(e) => setF({ ...f, logoUrl: e.target.value })} placeholder="https://…" /></Field>
            <Field label="Brand color"><input type="color" value={f.brandColor} onChange={(e) => setF({ ...f, brandColor: e.target.value })} /></Field>
            <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.publicRoadmap} onChange={(e) => setF({ ...f, publicRoadmap: e.target.checked })} /> Enable public roadmap</label>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setCreating(false)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create'}</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
