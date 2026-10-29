import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { ROLE_LABEL } from '../lib/utils';
import type { Role } from '../lib/types';

const NAV: { to: string; label: string; roles: Role[]; end?: boolean }[] = [
  { to: '', label: 'Dashboard', roles: ['owner', 'admin', 'pm'], end: true },
  { to: 'feedback', label: 'Feedback', roles: ['owner', 'admin', 'pm', 'customer'] },
  { to: 'roadmap', label: 'Roadmap', roles: ['owner', 'admin', 'pm', 'customer'] },
  { to: 'releases', label: 'Release Notes', roles: ['owner', 'admin', 'pm', 'customer'] },
  { to: 'taxonomy', label: 'Categories & Tags', roles: ['owner', 'admin'] },
  { to: 'team', label: 'Team & Roles', roles: ['owner', 'admin'] },
  { to: 'subscription', label: 'Subscription', roles: ['owner'] },
  { to: 'settings', label: 'Settings', roles: ['owner'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { ws, role } = useWorkspace();
  const [open, setOpen] = useState(false);
  const link = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`;
  return (
    <div className="min-h-screen md:flex">
      <header className="flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
        <span className="font-bold text-brand">{ws.name}</span>
        <button className="btn-ghost" onClick={() => setOpen(!open)} aria-label="Toggle menu">☰</button>
      </header>
      <aside className={`${open ? 'block' : 'hidden'} w-full shrink-0 border-r bg-white p-4 md:block md:w-60`}>
        <div className="mb-5 flex items-center gap-2">
          {ws.logoUrl ? <img src={ws.logoUrl} alt="" className="h-8 w-8 rounded object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} /> : <div className="h-8 w-8 rounded bg-brand" />}
          <div className="min-w-0"><p className="truncate font-bold">{ws.name}</p><p className="text-xs text-slate-500">{ROLE_LABEL[role]}</p></div>
        </div>
        <nav className="space-y-1" onClick={() => setOpen(false)}>
          {NAV.filter((n) => n.roles.includes(role)).map((n) => <NavLink key={n.label} to={n.to} end={n.end} className={link}>{n.label}</NavLink>)}
          {ws.publicRoadmap && <a href={`/public/${ws.slug}`} target="_blank" rel="noreferrer" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Public Roadmap ↗</a>}
        </nav>
        <div className="mt-6 border-t pt-4 text-sm">
          <p className="font-medium">{user?.name}</p><p className="mb-3 truncate text-xs text-slate-500">{user?.email}</p>
          <Link to="/" className="btn-ghost mb-2 w-full">Switch workspace</Link>
          <button className="btn-ghost w-full" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8"><Outlet /></main>
    </div>
  );
}
