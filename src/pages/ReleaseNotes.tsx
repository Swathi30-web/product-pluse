import { FormEvent, useState } from 'react';
import { Badge, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, useUI } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { api, errMsg, logActivity } from '../lib/api';
import type { ReleaseNote, ReleaseStatus, RoadmapItem } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { fmtDate } from '../lib/utils';

const blank = { version: '', title: '', releaseDate: new Date().toISOString().slice(0, 10), summary: '', roadmapItemIds: [] as number[], status: 'draft' as ReleaseStatus };
const COLOR: Record<ReleaseStatus, string> = { draft: 'bg-amber-100 text-amber-800', published: 'bg-green-100 text-green-800', archived: 'bg-slate-200 text-slate-600' };

export default function ReleaseNotes() {
  const { ws, isAdmin } = useWorkspace();
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const [ed, setEd] = useState<(typeof blank & { id?: number }) | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<ReleaseStatus | 'all'>('all');
  const { data, loading, error, reload } = useAsync(async () => {
    const [notes, items] = await Promise.all([api.list<ReleaseNote>('releaseNotes', { workspaceId: ws.id }), api.list<RoadmapItem>('roadmapItems', { workspaceId: ws.id })]);
    return { notes, items };
  }, [ws.id]);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error} onRetry={reload} />;

  const completed = data.items.filter((i) => i.stage === 'completed');
  const visible = data.notes.filter((n) => (isAdmin ? tab === 'all' || n.status === tab : n.status === 'published')).sort((a, b) => +new Date(b.releaseDate) - +new Date(a.releaseDate));
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast(ok); reload(); } catch (x) { toast(errMsg(x), 'error'); } };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!ed) return;
    const er: Record<string, string> = {};
    if (!/^\d+\.\d+\.\d+$/.test(ed.version.trim())) er.version = 'Use semantic version format, e.g. 1.4.0';
    else if (data.notes.some((n) => n.version === ed.version.trim() && n.id !== ed.id)) er.version = 'This version already exists';
    if (ed.title.trim().length < 3) er.title = 'Title is required';
    if (!ed.releaseDate) er.releaseDate = 'Release date is required';
    if (ed.summary.trim().length < 10) er.summary = 'Summary must be at least 10 characters';
    setErrs(er);
    if (Object.keys(er).length) return;
    const { id, ...rest } = ed;
    const body = { ...rest, version: rest.version.trim(), title: rest.title.trim(), summary: rest.summary.trim() };
    await run(async () => {
      if (id) await api.update('releaseNotes', id, body); else await api.create('releaseNotes', { workspaceId: ws.id, ...body });
      setEd(null);
    }, 'Release note saved');
  };
  const setStatus = (n: ReleaseNote, status: ReleaseStatus) => run(async () => { await api.update('releaseNotes', n.id, { status }); await logActivity(ws.id, user!.id, `${status} release v${n.version}`); }, `Release ${status}`);
  const del = async (n: ReleaseNote) => { if (await confirm(`Delete release v${n.version}?`)) run(() => api.remove('releaseNotes', n.id), 'Release note deleted'); };

  return (
    <>
      <PageHeader title="Release Notes" sub="What shipped and when">{isAdmin && <button className="btn-primary" onClick={() => { setErrs({}); setEd({ ...blank }); }}>+ New release</button>}</PageHeader>
      {isAdmin && <div className="mb-4 flex gap-2">{(['all', 'draft', 'published', 'archived'] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? 'bg-brand text-white' : 'border bg-white'} capitalize`}>{t}</button>)}</div>}
      {visible.length === 0 ? <Empty title="No release notes" hint={isAdmin ? 'Create your first release note.' : 'Nothing has been published yet.'} /> : (
        <div className="space-y-3">{visible.map((n) => (
          <article key={n.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">v{n.version} — {n.title}</h2>
              <div className="flex items-center gap-2"><span className="text-sm text-slate-500">{fmtDate(n.releaseDate)}</span>{isAdmin && <Badge className={COLOR[n.status]}>{n.status}</Badge>}</div>
            </div>
            <p className="mt-2 text-sm text-slate-700">{n.summary}</p>
            {n.roadmapItemIds.length > 0 && <ul className="mt-2 list-inside list-disc text-sm text-slate-600">{n.roadmapItemIds.map((id) => <li key={id}>{data.items.find((i) => i.id === id)?.title || 'Removed item'}</li>)}</ul>}
            {isAdmin && (
              <div className="mt-3 flex flex-wrap gap-3 border-t pt-2 text-sm">
                <button className="text-brand underline" onClick={() => { setErrs({}); setEd({ ...n }); }}>Edit</button>
                {n.status !== 'published' && <button className="text-green-700 underline" onClick={() => setStatus(n, 'published')}>Publish</button>}
                {n.status === 'published' && <button className="text-amber-700 underline" onClick={() => setStatus(n, 'draft')}>Unpublish</button>}
                {n.status !== 'archived' ? <button className="text-slate-600 underline" onClick={() => setStatus(n, 'archived')}>Archive</button> : <button className="text-slate-600 underline" onClick={() => setStatus(n, 'draft')}>Restore</button>}
                <button className="text-red-600 underline" onClick={() => del(n)}>Delete</button>
              </div>
            )}
          </article>))}</div>
      )}
      {ed && (
        <Modal wide title={ed.id ? 'Edit release note' : 'New release note'} onClose={() => setEd(null)}>
          <form onSubmit={save} noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Version *" error={errs.version}><input className="input" placeholder="1.4.0" value={ed.version} onChange={(e) => setEd({ ...ed, version: e.target.value })} /></Field>
              <Field label="Release date *" error={errs.releaseDate}><input type="date" className="input" value={ed.releaseDate} onChange={(e) => setEd({ ...ed, releaseDate: e.target.value })} /></Field>
            </div>
            <Field label="Title *" error={errs.title}><input className="input" value={ed.title} onChange={(e) => setEd({ ...ed, title: e.target.value })} /></Field>
            <Field label="Summary *" error={errs.summary}><textarea className="input" rows={3} value={ed.summary} onChange={(e) => setEd({ ...ed, summary: e.target.value })} /></Field>
            <Field label="Related completed features">
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border p-2 text-sm">
                {completed.length === 0 ? <span className="text-slate-500">No completed roadmap items yet.</span> : completed.map((i) => (
                  <label key={i.id} className="flex gap-2"><input type="checkbox" checked={ed.roadmapItemIds.includes(i.id)} onChange={() => setEd({ ...ed, roadmapItemIds: ed.roadmapItemIds.includes(i.id) ? ed.roadmapItemIds.filter((x) => x !== i.id) : [...ed.roadmapItemIds, i.id] })} />{i.title}</label>))}
              </div>
            </Field>
            <Field label="Status"><select className="input" value={ed.status} onChange={(e) => setEd({ ...ed, status: e.target.value as ReleaseStatus })}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setEd(null)}>Cancel</button><button className="btn-primary">Save</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
