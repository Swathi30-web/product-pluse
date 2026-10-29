import { FormEvent, useState } from 'react';
import { ErrorBox, Modal, PageHeader, Spinner, useUI, Empty } from '../components/ui';
import { useWorkspace } from '../context/WorkspaceContext';
import { api, errMsg } from '../lib/api';
import type { Category, Feedback, Tag } from '../lib/types';
import { useAsync } from '../lib/useAsync';

type Editing = { kind: 'category' | 'tag'; id?: number; name: string; color: string } | null;

export default function Taxonomy() {
  const { ws } = useWorkspace();
  const { toast, confirm } = useUI();
  const [ed, setEd] = useState<Editing>(null);
  const [err, setErr] = useState('');
  const { data, loading, error, reload } = useAsync(async () => {
    const [categories, tags, feedback] = await Promise.all([api.list<Category>('categories', { workspaceId: ws.id }), api.list<Tag>('tags', { workspaceId: ws.id }), api.list<Feedback>('feedback', { workspaceId: ws.id })]);
    return { categories, tags, feedback };
  }, [ws.id]);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error} onRetry={reload} />;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!ed) return;
    const name = ed.name.trim();
    const list = ed.kind === 'category' ? data.categories : data.tags;
    if (name.length < 2) return setErr('Name must be at least 2 characters');
    if (list.some((x) => x.name.toLowerCase() === name.toLowerCase() && x.id !== ed.id)) return setErr('That name already exists');
    try {
      const res = ed.kind === 'category' ? 'categories' : 'tags';
      const body = ed.kind === 'category' ? { name, color: ed.color } : { name };
      if (ed.id) await api.update(res, ed.id, body); else await api.create(res, { workspaceId: ws.id, ...body });
      toast(`${ed.kind === 'category' ? 'Category' : 'Tag'} saved`); setEd(null); setErr(''); reload();
    } catch (x) { toast(errMsg(x), 'error'); }
  };
  const delCat = async (c: Category) => {
    const used = data.feedback.filter((f) => f.categoryId === c.id).length;
    if (used) return toast(`"${c.name}" is used by ${used} feedback item(s). Reassign them first.`, 'error');
    if (!(await confirm(`Delete category "${c.name}"?`))) return;
    try { await api.remove('categories', c.id); toast('Category deleted'); reload(); } catch (x) { toast(errMsg(x), 'error'); }
  };
  const delTag = async (t: Tag) => {
    if (!(await confirm(`Delete tag "${t.name}"? It will be removed from all feedback.`))) return;
    try {
      await Promise.all(data.feedback.filter((f) => f.tagIds.includes(t.id)).map((f) => api.update('feedback', f.id, { tagIds: f.tagIds.filter((x) => x !== t.id) })));
      await api.remove('tags', t.id); toast('Tag deleted'); reload();
    } catch (x) { toast(errMsg(x), 'error'); }
  };

  return (
    <>
      <PageHeader title="Categories & Tags" sub="Organize feedback for your workspace" />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex justify-between"><h2 className="font-semibold">Categories</h2><button className="btn-primary" onClick={() => { setErr(''); setEd({ kind: 'category', name: '', color: '#6366f1' }); }}>+ Add</button></div>
          {data.categories.length === 0 ? <Empty title="No categories" /> : <ul className="divide-y">{data.categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2 text-sm">
              <span><span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: c.color }} />{c.name} <span className="text-xs text-slate-400">({data.feedback.filter((f) => f.categoryId === c.id).length})</span></span>
              <span className="space-x-3"><button className="text-brand underline" onClick={() => { setErr(''); setEd({ kind: 'category', id: c.id, name: c.name, color: c.color }); }}>Edit</button><button className="text-red-600 underline" onClick={() => delCat(c)}>Delete</button></span>
            </li>))}</ul>}
        </section>
        <section className="card">
          <div className="mb-3 flex justify-between"><h2 className="font-semibold">Tags</h2><button className="btn-primary" onClick={() => { setErr(''); setEd({ kind: 'tag', name: '', color: '' }); }}>+ Add</button></div>
          {data.tags.length === 0 ? <Empty title="No tags" /> : <ul className="divide-y">{data.tags.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2 text-sm">
              <span>#{t.name} <span className="text-xs text-slate-400">({data.feedback.filter((f) => f.tagIds.includes(t.id)).length})</span></span>
              <span className="space-x-3"><button className="text-brand underline" onClick={() => { setErr(''); setEd({ kind: 'tag', id: t.id, name: t.name, color: '' }); }}>Edit</button><button className="text-red-600 underline" onClick={() => delTag(t)}>Delete</button></span>
            </li>))}</ul>}
        </section>
      </div>
      {ed && (
        <Modal title={`${ed.id ? 'Edit' : 'New'} ${ed.kind}`} onClose={() => setEd(null)}>
          <form onSubmit={save} noValidate>
            <label className="label">Name *</label>
            <input className="input mb-1" value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })} autoFocus />
            {err && <p className="mb-2 text-xs text-red-600">{err}</p>}
            {ed.kind === 'category' && <div className="my-3"><label className="label">Color</label><input type="color" value={ed.color} onChange={(e) => setEd({ ...ed, color: e.target.value })} /></div>}
            <div className="mt-4 flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setEd(null)}>Cancel</button><button className="btn-primary">Save</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
