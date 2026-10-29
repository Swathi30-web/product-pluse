import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import VoteButton from '../components/VoteButton';
import { Badge, Empty, ErrorBox, Spinner, useUI } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { api, errMsg, loadBundle, logActivity } from '../lib/api';
import type { Comment, FStatus, Priority } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { fmtDate, PRIORITY, PRIORITY_COLOR, STATUS, STATUS_COLOR, voteTotal } from '../lib/utils';

export default function FeedbackDetail() {
  const { id } = useParams();
  const fid = Number(id);
  const { user } = useAuth();
  const { ws, isAdmin, isStaff, refresh } = useWorkspace();
  const { toast, confirm } = useUI();
  const nav = useNavigate();
  const { data, loading, error, reload } = useAsync(() => loadBundle(ws.id), [ws.id]);
  const [body, setBody] = useState(''); const [cErr, setCErr] = useState(''); const [target, setTarget] = useState('');

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error} onRetry={reload} />;
  const f = data.feedback.find((x) => x.id === fid);
  if (!f) return <Empty title="Feedback not found" hint="It may have been deleted."><Link to=".." relative="path" className="btn-ghost">Back to list</Link></Empty>;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast(ok); reload(); } catch (x) { toast(errMsg(x), 'error'); }
  };
  const nameOf = (uid: number) => data.users.find((u) => u.id === uid)?.name || 'Unknown';
  const cat = data.categories.find((c) => c.id === f.categoryId);
  const dups = data.feedback.filter((x) => x.duplicateOf === f.id);
  const primary = f.duplicateOf ? data.feedback.find((x) => x.id === f.duplicateOf) : null;
  const comments = data.comments.filter((c) => c.feedbackId === f.id).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const canEdit = isStaff || f.submitterId === user!.id;
  const candidates = data.feedback.filter((x) => x.id !== f.id && !x.duplicateOf && dups.length === 0);

  const remove = async () => {
    if (!(await confirm(`Delete "${f.title}"? Its votes and comments will also be removed.`))) return;
    try {
      await Promise.all([
        ...data.votes.filter((v) => v.feedbackId === f.id).map((v) => api.remove('votes', v.id)),
        ...data.comments.filter((c) => c.feedbackId === f.id).map((c) => api.remove('comments', c.id)),
        ...dups.map((d) => api.update('feedback', d.id, { duplicateOf: null })),
      ]);
      await api.remove('feedback', f.id);
      await logActivity(ws.id, user!.id, `deleted feedback "${f.title}"`);
      refresh(); toast('Feedback deleted'); nav('..', { relative: 'path' });
    } catch (x) { toast(errMsg(x), 'error'); }
  };
  const addComment = async (e: FormEvent) => {
    e.preventDefault();
    if (body.trim().length < 2) return setCErr('Comment cannot be empty');
    setCErr('');
    await run(() => api.create<Comment>('comments', { workspaceId: ws.id, feedbackId: f.id, userId: user!.id, body: body.trim(), createdAt: new Date().toISOString() }), 'Comment added');
    setBody('');
  };
  const link = async () => {
    if (!target) return;
    const p = data.feedback.find((x) => x.id === Number(target))!;
    if (!(await confirm(`Mark "${f.title}" as a duplicate of "${p.title}"?`))) return;
    await run(async () => { await api.update('feedback', f.id, { duplicateOf: p.id }); await logActivity(ws.id, user!.id, `merged "${f.title}" into "${p.title}"`); }, 'Linked as duplicate');
    setTarget('');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to=".." relative="path" className="mb-3 inline-block text-sm text-slate-500 hover:underline">← All feedback</Link>
      <div className="card mb-4">
        <div className="flex gap-4">
          <VoteButton workspaceId={ws.id} feedbackId={f.id} userId={user!.id} voted={data.votes.some((v) => v.feedbackId === f.id && v.userId === user!.id)} total={voteTotal(f, data.feedback, data.votes)} onDone={reload} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{f.title}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge className={STATUS_COLOR[f.status as FStatus]}>{STATUS[f.status as FStatus]}</Badge>
              <Badge className={PRIORITY_COLOR[f.priority as Priority]}>{PRIORITY[f.priority as Priority]} priority</Badge>
              {cat && <Badge className="bg-slate-100" >{cat.name}</Badge>}
              {f.tagIds.map((t) => <Badge key={t} className="bg-slate-100 text-slate-600">#{data.tags.find((x) => x.id === t)?.name}</Badge>)}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-slate-700">{f.description}</p>
            <p className="mt-3 text-xs text-slate-500">Submitted by {nameOf(f.submitterId)} on {fmtDate(f.createdAt)} · {dups.length} linked duplicate{dups.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        {(canEdit || isAdmin) && (
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
            {canEdit && <Link to="edit" className="btn-ghost">Edit</Link>}
            {(isAdmin || f.submitterId === user!.id) && <button className="btn-danger" onClick={remove}>Delete</button>}
          </div>
        )}
      </div>

      {isStaff && (
        <div className="card mb-4 grid gap-3 sm:grid-cols-2">
          <div><label className="label">Status</label><select className="input" value={f.status} onChange={(e) => run(() => api.update('feedback', f.id, { status: e.target.value }), 'Status updated')}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="label">Priority</label><select className="input" value={f.priority} onChange={(e) => run(() => api.update('feedback', f.id, { priority: e.target.value }), 'Priority updated')}>{Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
      )}

      <div className="card mb-4">
        <h2 className="mb-2 font-semibold">Duplicates</h2>
        {primary && (
          <p className="text-sm">This is a duplicate of <Link className="font-medium text-brand underline" to={`../${primary.id}`} relative="path">{primary.title}</Link>.
            {isStaff && <button className="ml-2 text-red-600 underline" onClick={() => run(() => api.update('feedback', f.id, { duplicateOf: null }), 'Duplicate link removed')}>Unlink</button>}</p>
        )}
        {dups.length > 0 && <>
          <p className="mb-2 text-sm text-slate-600">{dups.length} request{dups.length > 1 ? 's' : ''} linked to this one:</p>
          <ul className="space-y-1 text-sm">{dups.map((d) => <li key={d.id} className="flex justify-between"><Link className="text-brand underline" to={`../${d.id}`} relative="path">{d.title}</Link>
            {isStaff && <button className="text-red-600 underline" onClick={() => run(() => api.update('feedback', d.id, { duplicateOf: null }), 'Unlinked')}>Unlink</button>}</li>)}</ul></>}
        {!primary && dups.length === 0 && <p className="text-sm text-slate-500">No linked duplicates.</p>}
        {isStaff && !primary && dups.length === 0 && (
          <div className="mt-3 flex gap-2">
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Primary request"><option value="">Link as duplicate of…</option>{candidates.map((c) => <option key={c.id} value={c.id}>#{c.id} {c.title}</option>)}</select>
            <button className="btn-primary" disabled={!target} onClick={link}>Link</button>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Comments ({comments.length})</h2>
        {comments.length === 0 ? <p className="mb-3 text-sm text-slate-500">No comments yet. Start the conversation.</p> : (
          <ul className="mb-4 space-y-3">{comments.map((c) => (
            <li key={c.id} className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="mb-1 flex justify-between text-xs text-slate-500"><b className="text-slate-700">{nameOf(c.userId)}</b><span>{fmtDate(c.createdAt)}</span></div>
              <p className="whitespace-pre-wrap">{c.body}</p>
              {(isAdmin || c.userId === user!.id) && <button className="mt-1 text-xs text-red-600 underline" onClick={async () => (await confirm('Delete this comment?')) && run(() => api.remove('comments', c.id), 'Comment deleted')}>Delete</button>}
            </li>))}</ul>
        )}
        <form onSubmit={addComment} noValidate>
          <textarea className="input" rows={3} placeholder="Add a comment…" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Comment" />
          {cErr && <p className="mt-1 text-xs text-red-600">{cErr}</p>}
          <button className="btn-primary mt-2">Post comment</button>
        </form>
      </div>
    </div>
  );
}
