import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorBox, Field, PageHeader, Spinner, useUI } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { api, errMsg, logActivity } from '../lib/api';
import type { Category, Feedback, Priority, Tag } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { PRIORITY, STATUS } from '../lib/utils';

export default function FeedbackForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { user } = useAuth();
  const { ws, isStaff, isAdmin, limitError, refresh } = useWorkspace();
  const nav = useNavigate();
  const { toast } = useUI();
  const [f, setF] = useState({ title: '', description: '', categoryId: '', tagIds: [] as number[], priority: 'medium', status: 'open' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(async () => {
    const [categories, tags, existing] = await Promise.all([
      api.list<Category>('categories', { workspaceId: ws.id }), api.list<Tag>('tags', { workspaceId: ws.id }),
      editing ? api.get<Feedback>('feedback', id!) : Promise.resolve(null),
    ]);
    return { categories, tags, existing };
  }, [ws.id, id]);

  useEffect(() => {
    const e = data?.existing;
    if (e) setF({ title: e.title, description: e.description, categoryId: String(e.categoryId), tagIds: e.tagIds, priority: e.priority, status: e.status });
  }, [data?.existing]);

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error} onRetry={reload} />;
  if (editing && (!data.existing || data.existing.workspaceId !== ws.id)) return <ErrorBox message="Feedback not found." />;
  if (editing && !isAdmin && !isStaff && data.existing!.submitterId !== user!.id) return <ErrorBox message="You can only edit your own feedback." />;
  const limit = !editing ? limitError('feedback') : '';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.title.trim().length < 5) er.title = 'Title must be at least 5 characters';
    if (f.description.trim().length < 10) er.description = 'Description must be at least 10 characters';
    if (!f.categoryId) er.categoryId = 'Please choose a category';
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const body = { title: f.title.trim(), description: f.description.trim(), categoryId: Number(f.categoryId), tagIds: f.tagIds, ...(isStaff ? { priority: f.priority, status: f.status } : {}) };
      if (editing) { await api.update('feedback', id!, body); toast('Feedback updated'); nav(`../${id}`, { relative: 'path' }); }
      else {
        const fresh = await api.create<Feedback>('feedback', { workspaceId: ws.id, submitterId: user!.id, priority: 'medium', status: 'open', duplicateOf: null, createdAt: new Date().toISOString(), ...body });
        await logActivity(ws.id, user!.id, `submitted feedback "${fresh.title}"`);
        refresh(); toast('Feedback submitted'); nav(`../${fresh.id}`, { relative: 'path' });
      }
    } catch (x) { toast(errMsg(x), 'error'); } finally { setBusy(false); }
  };
  const toggleTag = (t: number) => setF({ ...f, tagIds: f.tagIds.includes(t) ? f.tagIds.filter((x) => x !== t) : [...f.tagIds, t] });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={editing ? 'Edit feedback' : 'New feedback'} />
      {limit && <div className="mb-4"><ErrorBox message={limit} /></div>}
      <form onSubmit={submit} className="card" noValidate>
        <Field label="Title *" error={errs.title}><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={120} /></Field>
        <Field label="Description *" error={errs.description}><textarea className="input" rows={5} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Category *" error={errs.categoryId}>
          <select className="input" value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}><option value="">Select…</option>{data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </Field>
        <Field label="Tags">
          <div className="flex flex-wrap gap-2">{data.tags.length ? data.tags.map((t) => (
            <label key={t.id} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${f.tagIds.includes(t.id) ? 'border-brand bg-brand text-white' : 'border-slate-300'}`}>
              <input type="checkbox" className="hidden" checked={f.tagIds.includes(t.id)} onChange={() => toggleTag(t.id)} />#{t.name}</label>
          )) : <span className="text-sm text-slate-500">No tags available.</span>}</div>
        </Field>
        {isStaff && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Priority"><select className="input" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>{Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Status"><select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Link to={editing ? `../${id}` : '..'} relative="path" className="btn-ghost">Cancel</Link>
          <button className="btn-primary" disabled={busy || Boolean(limit)}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Submit'}</button>
        </div>
      </form>
    </div>
  );
}
