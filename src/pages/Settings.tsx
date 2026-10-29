import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field, PageHeader, useUI } from '../components/ui';
import { useWorkspace } from '../context/WorkspaceContext';
import { api, errMsg } from '../lib/api';

const CHILDREN = ['workspaceMembers', 'categories', 'tags', 'feedback', 'votes', 'comments', 'roadmapItems', 'releaseNotes', 'workspaceSubscriptions', 'activityLogs'];

export default function Settings() {
  const { ws, refresh } = useWorkspace();
  const { toast, confirm } = useUI();
  const nav = useNavigate();
  const [f, setF] = useState({ name: ws.name, description: ws.description, logoUrl: ws.logoUrl, brandColor: ws.brandColor, publicRoadmap: ws.publicRoadmap });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 3) er.name = 'Name must be at least 3 characters';
    if (f.logoUrl && !/^https?:\/\//.test(f.logoUrl)) er.logoUrl = 'Logo must be a valid http(s) URL';
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try { await api.update('workspaces', ws.id, { ...f, name: f.name.trim() }); toast('Settings saved'); refresh(); } catch (x) { toast(errMsg(x), 'error'); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!(await confirm(`Permanently delete "${ws.name}" and ALL its data? This cannot be undone.`))) return;
    try {
      for (const r of CHILDREN) { const rows = await api.list<{ id: number }>(r, { workspaceId: ws.id }); await Promise.all(rows.map((x) => api.remove(r, x.id))); }
      await api.remove('workspaces', ws.id); toast('Workspace deleted'); nav('/');
    } catch (x) { toast(errMsg(x), 'error'); }
  };
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Workspace Settings" />
      <form onSubmit={save} className="card mb-6" noValidate>
        <Field label="Workspace name *" error={errs.name}><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Description"><textarea className="input" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Logo URL" error={errs.logoUrl}><input className="input" value={f.logoUrl} onChange={(e) => setF({ ...f, logoUrl: e.target.value })} placeholder="https://…" /></Field>
        <Field label="Brand color"><input type="color" value={f.brandColor} onChange={(e) => setF({ ...f, brandColor: e.target.value })} /></Field>
        <label className="mb-1 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.publicRoadmap} onChange={(e) => setF({ ...f, publicRoadmap: e.target.checked })} /> Enable public roadmap</label>
        {f.publicRoadmap && <p className="mb-3 text-xs text-slate-500">Public URL: <a className="text-brand underline" href={`/public/${ws.slug}`} target="_blank" rel="noreferrer">/public/{ws.slug}</a></p>}
        <button className="btn-primary mt-2" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
      <div className="card border-red-200"><h2 className="font-semibold text-red-700">Danger zone</h2><p className="my-2 text-sm text-slate-600">Deleting a workspace removes all feedback, votes, roadmap items and members.</p><button className="btn-danger" onClick={del}>Delete workspace</button></div>
    </div>
  );
}
