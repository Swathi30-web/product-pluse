import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import VoteButton from '../components/VoteButton';
import { Badge, Empty, ErrorBox, PageHeader, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { loadBundle } from '../lib/api';
import type { FStatus, Priority } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { duplicateCount, fmtDate, PRIORITY, PRIORITY_COLOR, STATUS, STATUS_COLOR, voteTotal } from '../lib/utils';

export default function FeedbackList() {
  const { user } = useAuth();
  const { ws } = useWorkspace();
  const { data, loading, error, reload } = useAsync(() => loadBundle(ws.id), [ws.id]);
  const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [tag, setTag] = useState('');
  const [status, setStatus] = useState(''); const [prio, setPrio] = useState(''); const [date, setDate] = useState('');
  const [sort, setSort] = useState('newest'); const [hideDup, setHideDup] = useState(false);

  const rows = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    const list = data.feedback.filter((f) => {
      const s = q.trim().toLowerCase();
      if (s && !f.title.toLowerCase().includes(s) && !f.description.toLowerCase().includes(s)) return false;
      if (cat && f.categoryId !== Number(cat)) return false;
      if (tag && !f.tagIds.includes(Number(tag))) return false;
      if (status && f.status !== status) return false;
      if (prio && f.priority !== prio) return false;
      if (date && now - new Date(f.createdAt).getTime() > Number(date) * 864e5) return false;
      if (hideDup && f.duplicateOf) return false;
      return true;
    });
    const votes = (f: (typeof list)[number]) => voteTotal(f, data.feedback, data.votes);
    return list.sort((a, b) => sort === 'votes' ? votes(b) - votes(a) : sort === 'oldest' ? +new Date(a.createdAt) - +new Date(b.createdAt) : +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [data, q, cat, tag, status, prio, date, sort, hideDup]);

  const clear = () => { setQ(''); setCat(''); setTag(''); setStatus(''); setPrio(''); setDate(''); setHideDup(false); };
  return (
    <>
      <PageHeader title="Feedback" sub="Share ideas and vote on what matters most"><Link to="new" className="btn-primary">+ New feedback</Link></PageHeader>
      <div className="card mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input className="input sm:col-span-2" placeholder="Search title or description…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className="input" value={tag} onChange={(e) => setTag(e.target.value)}><option value="">All tags</option>{data?.tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="input" value={prio} onChange={(e) => setPrio(e.target.value)}><option value="">All priorities</option>{Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="input" value={date} onChange={(e) => setDate(e.target.value)}><option value="">Any date</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="votes">Most votes</option></select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hideDup} onChange={(e) => setHideDup(e.target.checked)} /> Hide duplicates</label>
        <button className="btn-ghost" onClick={clear}>Clear filters</button>
      </div>
      {loading ? <Spinner /> : error || !data ? <ErrorBox message={error} onRetry={reload} /> : rows.length === 0 ? (
        <Empty title={data.feedback.length ? 'No feedback matches your filters' : 'No feedback yet'} hint={data.feedback.length ? 'Try adjusting the search or filters.' : 'Be the first to submit an idea.'}>
          {data.feedback.length ? <button className="btn-ghost" onClick={clear}>Clear filters</button> : <Link to="new" className="btn-primary">Submit feedback</Link>}
        </Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((f) => {
            const c = data.categories.find((x) => x.id === f.categoryId);
            const dups = duplicateCount(f.id, data.feedback);
            const voted = data.votes.some((v) => v.feedbackId === f.id && v.userId === user!.id);
            return (
              <li key={f.id}>
                <Link to={String(f.id)} className="card flex gap-4 transition hover:shadow-md">
                  <VoteButton workspaceId={ws.id} feedbackId={f.id} userId={user!.id} voted={voted} total={voteTotal(f, data.feedback, data.votes)} onDone={reload} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{f.title}</h3>
                      <Badge className={STATUS_COLOR[f.status as FStatus]}>{STATUS[f.status as FStatus]}</Badge>
                      <Badge className={PRIORITY_COLOR[f.priority as Priority]}>{PRIORITY[f.priority as Priority]}</Badge>
                      {f.duplicateOf && <Badge className="bg-rose-100 text-rose-700">Duplicate of #{f.duplicateOf}</Badge>}
                      {dups > 0 && <Badge className="bg-indigo-100 text-indigo-700">{dups} linked</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{f.description}</p>
                    <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      {c && <span style={{ color: c.color }}>● {c.name}</span>}
                      <span>by {data.users.find((u) => u.id === f.submitterId)?.name || 'Unknown'}</span><span>{fmtDate(f.createdAt)}</span>
                      <span>💬 {data.comments.filter((x) => x.feedbackId === f.id).length}</span>
                      {f.tagIds.map((t) => <span key={t}>#{data.tags.find((x) => x.id === t)?.name}</span>)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
