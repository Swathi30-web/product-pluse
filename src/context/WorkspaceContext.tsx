import { createContext, ReactNode, useContext, useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Member, Plan, Role, Workspace, WorkspaceSub } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { ErrorBox, Spinner } from '../components/ui';
import { useAuth } from './AuthContext';

export type LimitKind = 'members' | 'feedback' | 'roadmap';
interface Ctx {
  ws: Workspace; member: Member; role: Role; plan: Plan; sub: WorkspaceSub;
  usage: Record<LimitKind, number>; limits: Record<LimitKind, number>;
  isOwner: boolean; isAdmin: boolean; isStaff: boolean;
  limitError: (k: LimitKind) => string; refresh: () => void;
}
const WsCtx = createContext<Ctx>(null as unknown as Ctx);
export const useWorkspace = () => useContext(WsCtx);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { wid } = useParams();
  const { user } = useAuth();
  const id = Number(wid);
  const { data, loading, error, reload } = useAsync(async () => {
    const [ws, members, subs, plans, m, f, r] = await Promise.all([
      api.get<Workspace>('workspaces', id),
      api.list<Member>('workspaceMembers', { workspaceId: id, userId: user!.id }),
      api.list<WorkspaceSub>('workspaceSubscriptions', { workspaceId: id }),
      api.list<Plan>('subscriptionPlans'),
      api.list<Member>('workspaceMembers', { workspaceId: id }),
      api.list('feedback', { workspaceId: id }),
      api.list('roadmapItems', { workspaceId: id }),
    ]);
    return { ws, member: members[0], sub: subs[0], plans, usage: { members: m.length, feedback: f.length, roadmap: r.length } };
  }, [id, user?.id]);

  useEffect(() => {
    if (data?.ws) document.documentElement.style.setProperty('--brand', data.ws.brandColor || '#4f46e5');
    return () => { document.documentElement.style.setProperty('--brand', '#4f46e5'); };
  }, [data?.ws]);

  if (loading && !data) return <Spinner label="Loading workspace…" />;
  if (error) return <div className="p-6"><ErrorBox message={error.includes('404') ? 'Workspace not found.' : error} onRetry={reload} /></div>;
  if (!data) return null;
  if (!data.member) return <Navigate to="/" replace />;
  if (data.member.status === 'suspended')
    return <div className="p-10 text-center"><h1 className="text-xl font-bold">Access suspended</h1><p className="text-slate-500">Your membership in this workspace is suspended. Contact the workspace owner.</p></div>;

  const plan = data.plans.find((p) => p.id === data.sub?.planId) || data.plans[0];
  const role = data.member.role;
  const limits = { members: plan.maxMembers, feedback: plan.maxFeedback, roadmap: plan.maxRoadmap };
  const value: Ctx = {
    ws: data.ws, member: data.member, role, plan, sub: data.sub, usage: data.usage, limits,
    isOwner: role === 'owner', isAdmin: role === 'owner' || role === 'admin', isStaff: role !== 'customer',
    limitError: (k) => (data.usage[k] >= limits[k] ? `Your ${plan.name} plan allows ${limits[k]} ${k === 'roadmap' ? 'roadmap items' : k === 'feedback' ? 'feedback items' : 'members'}. Upgrade to add more.` : ''),
    refresh: reload,
  };
  return <WsCtx.Provider value={value}>{children}</WsCtx.Provider>;
}
