import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useWorkspace } from '../context/WorkspaceContext';
import { api, loadBundle } from '../lib/api';
import type { Activity, RoadmapItem } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { fmtDate, STAGES, STATUS } from '../lib/utils';
import { ErrorBox, PageHeader, Spinner, UsageBar } from '../components/ui';

const COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6'];

export default function Dashboard() {
  const { ws, usage, limits, plan } = useWorkspace();
  const { data, loading, error, reload } = useAsync(async () => {
    const [b, roadmap, activity] = await Promise.all([
      loadBundle(ws.id), api.list<RoadmapItem>('roadmapItems', { workspaceId: ws.id }),
      api.list<Activity>('activityLogs', { workspaceId: ws.id, _sort: 'createdAt', _order: 'desc', _limit: 6 }),
    ]);
    return { b, roadmap, activity };
  }, [ws.id]);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error} onRetry={reload} />;
  const { b, roadmap, activity } = data;
  const open = b.feedback.filter((f) => f.status === 'open' || f.status === 'under_review').length;
  const completed = roadmap.filter((r) => r.stage === 'completed').length;
  const progress = roadmap.length ? Math.round((completed / roadmap.length) * 100) : 0;
  const byCat = b.categories.map((c) => ({ name: c.name, count: b.feedback.filter((f) => f.categoryId === c.id).length, color: c.color }));
  const byStatus = Object.entries(STATUS).map(([k, label]) => ({ name: label, value: b.feedback.filter((f) => f.status === k).length })).filter((x) => x.value);
  const byStage = STAGES.map((s) => ({ name: s.label, count: roadmap.filter((r) => r.stage === s.key).length }));
  const stats = [
    ['Total feedback', b.feedback.length], ['Total votes', b.votes.length], ['Open requests', open],
    ['Roadmap progress', `${progress}%`], ['Completed features', completed],
  ];
  const nameOf = (id: number) => b.users.find((u) => u.id === id)?.name || 'Someone';
  return (
    <>
      <PageHeader title="Dashboard" sub={`Overview of ${ws.name}`} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map(([l, v]) => <div key={l} className="card"><p className="text-xs uppercase text-slate-500">{l}</p><p className="mt-1 text-2xl font-bold text-brand">{v}</p></div>)}
      </div>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="card"><h2 className="mb-3 font-semibold">Feedback by category</h2>
          {byCat.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={byCat}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" name="Feedback">{byCat.map((c, i) => <Cell key={i} fill={c.color || COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer> : <p className="py-10 text-center text-sm text-slate-500">No categories yet.</p>}
        </div>
        <div className="card"><h2 className="mb-3 font-semibold">Feedback by status</h2>
          {byStatus.length ? <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={90} label>{byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer> : <p className="py-10 text-center text-sm text-slate-500">No feedback yet.</p>}
        </div>
        <div className="card"><h2 className="mb-3 font-semibold">Roadmap by stage</h2>
          <ResponsiveContainer width="100%" height={220}><BarChart data={byStage}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" name="Items" fill="#6366f1" /></BarChart></ResponsiveContainer>
        </div>
        <div className="card"><h2 className="mb-3 font-semibold">Plan usage ({plan.name})</h2>
          <UsageBar label="Members" used={usage.members} max={limits.members} />
          <UsageBar label="Feedback items" used={usage.feedback} max={limits.feedback} />
          <UsageBar label="Roadmap items" used={usage.roadmap} max={limits.roadmap} />
        </div>
      </div>
      <div className="card"><h2 className="mb-3 font-semibold">Recent activity</h2>
        {activity.length ? <ul className="divide-y text-sm">{activity.map((a) => <li key={a.id} className="flex justify-between py-2"><span><b>{nameOf(a.userId)}</b> {a.action}</span><span className="text-slate-400">{fmtDate(a.createdAt)}</span></li>)}</ul> : <p className="text-sm text-slate-500">No activity yet.</p>}
      </div>
    </>
  );
}
