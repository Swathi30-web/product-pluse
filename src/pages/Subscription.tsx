import { ErrorBox, PageHeader, Spinner, UsageBar, useUI } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { api, errMsg, logActivity } from '../lib/api';
import type { Plan } from '../lib/types';
import { useAsync } from '../lib/useAsync';

export default function Subscription() {
  const { ws, plan, sub, usage, limits, refresh } = useWorkspace();
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const { data: plans, loading, error, reload } = useAsync(() => api.list<Plan>('subscriptionPlans'), []);
  if (loading) return <Spinner />;
  if (error || !plans) return <ErrorBox message={error} onRetry={reload} />;

  const change = async (p: Plan) => {
    const over = (usage.members > p.maxMembers && 'members') || (usage.feedback > p.maxFeedback && 'feedback items') || (usage.roadmap > p.maxRoadmap && 'roadmap items');
    if (over) return toast(`Cannot switch to ${p.name}: you currently use more ${over} than it allows.`, 'error');
    if (!(await confirm(`Switch ${ws.name} to the ${p.name} plan? (Demo only, no payment is taken.)`))) return;
    try { await api.update('workspaceSubscriptions', sub.id, { planId: p.id }); await logActivity(ws.id, user!.id, `changed plan to ${p.name}`); toast(`Now on the ${p.name} plan`); refresh(); } catch (x) { toast(errMsg(x), 'error'); }
  };
  return (
    <>
      <PageHeader title="Subscription & Usage" sub="Demo plans — no real payments" />
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="card"><h2 className="mb-3 font-semibold">Current usage — {plan.name}</h2>
          <UsageBar label="Members" used={usage.members} max={limits.members} />
          <UsageBar label="Feedback items" used={usage.feedback} max={limits.feedback} />
          <UsageBar label="Roadmap items" used={usage.roadmap} max={limits.roadmap} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {plans.map((p) => (
            <div key={p.id} className={`card ${p.id === plan.id ? 'ring-2 ring-brand' : ''}`}>
              <h3 className="text-lg font-bold">{p.name}</h3><p className="text-2xl font-extrabold">${p.price}<span className="text-sm font-normal text-slate-500">/mo</span></p>
              <ul className="my-3 space-y-1 text-sm text-slate-600"><li>{p.maxMembers} members</li><li>{p.maxFeedback} feedback items</li><li>{p.maxRoadmap} roadmap items</li></ul>
              {p.id === plan.id ? <span className="text-sm font-medium text-brand">Current plan</span> : <button className="btn-primary w-full" onClick={() => change(p)}>{p.price > plan.price ? 'Upgrade' : 'Downgrade'}</button>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
