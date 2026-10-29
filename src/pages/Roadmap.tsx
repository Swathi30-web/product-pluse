import { FormEvent, useState } from 'react';
import { Badge, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, useUI } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { api, errMsg, logActivity } from '../lib/api';
import type { Feedback, RoadmapItem, Stage } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { STAGES } from '../lib/utils';

const blank = { title: '', description: '', stage: 'under_review' as Stage, feedbackIds: [] as number[], published: true };

export default function Roadmap() {
  const { ws, isStaff, isAdmin, limitError, refresh } = useWorkspace();
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const [ed, setEd] = useState<(typeof blank & { id?: number }) | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(async () => {
    const [items, feedback] = await Promise.all([api.list<RoadmapItem>('roadmapItems', { workspaceId: ws.id }), api.list<Feedback>('feedback', { workspaceId: ws.id })]);
    return { items, feedback };
  }, [ws.id]);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error} onRetry={reload} />;

  const items = isStaff ? data.items : data.items.filter((i) => i.published);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!ed) return;
    const er: Record<string, string> = {};
    if (ed.title.trim().length < 3) er.title = 'Title must be at least 3 characters';
    if (!ed.description.trim()) er.description = 'Description is required';
    setErrs(er);
    if (Object.keys(er).length) return;
    if (!ed.id) { const l = limitError('roadmap'); if (l) return toast(l, 'error'); }
    setBusy(true);
    try {
      const body = { title: ed.title.trim(), description: ed.description.trim(), stage: ed.stage, feedbackIds: ed.feedbackIds, published: ed.published };
      if (ed.id) await api.update('roadmapItems', ed.id, body);
      else { await api.create('roadmapItems', { workspaceId: ws.id, createdAt: new Date().toISOString(), ...body }); await logActivity(ws.id, user!.id, `added roadmap item "${body.title}"`); refresh(); }
      toast('Roadmap item saved'); setEd(null); reload();
    } catch (x) { toast(errMsg(x), 'error'); } finally { setBusy(false); }
  };
  const move = async (i: RoadmapItem, stage: Stage) => {
    try {
      await api.update('roadmapItems', i.id, { stage });
      await logActivity(ws.id, user!.id, `moved "${i.title}" to ${STAGES.find((s) => s.key === stage)!.label}`);
      toast('Stage updated'); reload();
    } catch (x) { toast(errMsg(x), 'error'); }
  };
  const del = async (i: RoadmapItem) => {
    if (!(await confirm(`Delete roadmap item "${i.title}"?`))) return;
    try { await api.remove('roadmapItems', i.id); toast('Roadmap item deleted'); refresh(); reload(); } catch (x) { toast(errMsg(x), 'error'); }
  };

  return (
    <>
      <PageHeader title="Roadmap" sub={isStaff ? 'Manage stages and link feedback' : 'See what we are working on'}>
        {isStaff && <button className="btn-primary" onClick={() => { setErrs({}); setEd({ ...blank }); }}>+ New item</button>}
      </PageHeader>
      {items.length === 0 ? <Empty title="No roadmap items yet" hint={isStaff ? 'Create the first item to get started.' : 'Check back soon.'} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((s) => (
            <section key={s.key} className="rounded-xl bg-slate-100 p-3">
              <h2 className="mb-3 flex justify-between text-sm font-semibold uppercase text-slate-600"><span>{s.label}</span><span>{items.filter((i) => i.stage === s.key).length}</span></h2>
              <div className="space-y-3">
                {items.filter((i) => i.stage === s.key).map((i) => (
                  <article key={i.id} className="card !p-3">
                    <h3 className="font-medium">{i.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{i.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge className="bg-indigo-100 text-indigo-700">{i.feedbackIds.length} linked request{i.feedbackIds.length === 1 ? '' : 's'}</Badge>
                      {isStaff && <Badge className={i.published ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}>{i.published ? 'Published' : 'Hidden'}</Badge>}
                    </div>
                    {isStaff && (
                      <div className="mt-3 space-y-2">
                        <select className="input !py-1 text-xs" value={i.stage} onChange={(e) => move(i, e.target.value as Stage)} aria-label="Stage">{STAGES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select>
                        <div className="flex gap-3 text-xs"><button className="text-brand underline" onClick={() => { setErrs({}); setEd({ ...i }); }}>Edit</button>{isAdmin && <button className="text-red-600 underline" onClick={() => del(i)}>Delete</button>}</div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {ed && (
        <Modal wide title={ed.id ? 'Edit roadmap item' : 'New roadmap item'} onClose={() => setEd(null)}>
          <form onSubmit={save} noValidate>
            <Field label="Title *" error={errs.title}><input className="input" value={ed.title} onChange={(e) => setEd({ ...ed, title: e.target.value })} /></Field>
            <Field label="Description *" error={errs.description}><textarea className="input" rows={3} value={ed.description} onChange={(e) => setEd({ ...ed, description: e.target.value })} /></Field>
            <Field label="Stage"><select className="input" value={ed.stage} onChange={(e) => setEd({ ...ed, stage: e.target.value as Stage })}>{STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select></Field>
            <Field label="Linked feedback">
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2 text-sm">
                {data.feedback.length === 0 ? <span className="text-slate-500">No feedback to link.</span> : data.feedback.map((f) => (
                  <label key={f.id} className="flex gap-2"><input type="checkbox" checked={ed.feedbackIds.includes(f.id)} onChange={() => setEd({ ...ed, feedbackIds: ed.feedbackIds.includes(f.id) ? ed.feedbackIds.filter((x) => x !== f.id) : [...ed.feedbackIds, f.id] })} />#{f.id} {f.title}</label>
                ))}
              </div>
            </Field>
            <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={ed.published} onChange={(e) => setEd({ ...ed, published: e.target.checked })} /> Show on public roadmap</label>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setEd(null)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
