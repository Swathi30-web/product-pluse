import { FormEvent, useState } from 'react';
import { Badge, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, useUI } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { api, errMsg, logActivity } from '../lib/api';
import type { Member, MemberStatus, Role, User } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { ROLE_LABEL } from '../lib/utils';

const STATUS_COLOR: Record<MemberStatus, string> = { active: 'bg-green-100 text-green-800', invited: 'bg-amber-100 text-amber-800', suspended: 'bg-red-100 text-red-700' };

export default function Team() {
  const { ws, role: myRole, isOwner, limitError, usage, limits, refresh } = useWorkspace();
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const [ed, setEd] = useState<{ id?: number; userId?: number; name: string; email: string; role: Role; status: MemberStatus } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const { data, loading, error, reload } = useAsync(async () => {
    const [members, users] = await Promise.all([api.list<Member>('workspaceMembers', { workspaceId: ws.id }), api.list<User>('users')]);
    return { members, users };
  }, [ws.id]);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error} onRetry={reload} />;

  const roles: Role[] = isOwner ? ['owner', 'admin', 'pm', 'customer'] : ['admin', 'pm', 'customer'];
  const canManage = (m: Member) => isOwner || m.role !== 'owner';
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!ed) return;
    const er: Record<string, string> = {};
    if (!ed.id) {
      if (ed.name.trim().length < 2) er.name = 'Name is required';
      if (!/^\S+@\S+\.\S+$/.test(ed.email)) er.email = 'Enter a valid email';
    }
    setErrs(er);
    if (Object.keys(er).length) return;
    try {
      if (ed.id) {
        await api.update('workspaceMembers', ed.id, { role: ed.role, status: ed.status });
        toast('Member updated');
      } else {
        const l = limitError('members'); if (l) return toast(l, 'error');
        const email = ed.email.trim().toLowerCase();
        let [u] = await api.list<User>('users', { email });
        if (!u) u = await api.create<User>('users', { name: ed.name.trim(), email, password: 'demo123' });
        if (data.members.some((m) => m.userId === u.id)) return setErrs({ email: 'This person is already a member' });
        await api.create('workspaceMembers', { workspaceId: ws.id, userId: u.id, role: ed.role, status: 'invited' });
        await logActivity(ws.id, user!.id, `added ${u.name} as ${ROLE_LABEL[ed.role]}`);
        toast('Member added (invited)'); refresh();
      }
      setEd(null); reload();
    } catch (x) { toast(errMsg(x), 'error'); }
  };
  const remove = async (m: Member, name: string) => {
    if (m.role === 'owner' && data.members.filter((x) => x.role === 'owner').length < 2) return toast('A workspace needs at least one owner.', 'error');
    if (!(await confirm(`Remove ${name} from this workspace?`))) return;
    try { await api.remove('workspaceMembers', m.id); toast('Member removed'); refresh(); reload(); } catch (x) { toast(errMsg(x), 'error'); }
  };

  return (
    <>
      <PageHeader title="Team & Roles" sub={`${usage.members} of ${limits.members} seats used`}>
        <button className="btn-primary" onClick={() => { setErrs({}); setEd({ name: '', email: '', role: 'customer', status: 'invited' }); }}>+ Add member</button>
      </PageHeader>
      {data.members.length === 0 ? <Empty title="No members" /> : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Member</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y">
              {data.members.map((m) => {
                const u = data.users.find((x) => x.id === m.userId);
                return (
                  <tr key={m.id}>
                    <td className="p-3"><p className="font-medium">{u?.name}{m.userId === user!.id && ' (you)'}</p><p className="text-xs text-slate-500">{u?.email}</p></td>
                    <td className="p-3">{ROLE_LABEL[m.role]}</td>
                    <td className="p-3"><Badge className={STATUS_COLOR[m.status]}>{m.status}</Badge></td>
                    <td className="space-x-3 p-3 text-right">
                      {canManage(m) ? <>
                        <button className="text-brand underline" onClick={() => { setErrs({}); setEd({ id: m.id, userId: m.userId, name: u?.name || '', email: u?.email || '', role: m.role, status: m.status }); }}>Edit</button>
                        {m.userId !== user!.id && <button className="text-red-600 underline" onClick={() => remove(m, u?.name || 'this member')}>Remove</button>}
                      </> : <span className="text-xs text-slate-400">Owner only</span>}
                    </td>
                  </tr>);
              })}
            </tbody>
          </table>
        </div>
      )}
      {ed && (
        <Modal title={ed.id ? 'Edit member' : 'Add member'} onClose={() => setEd(null)}>
          <form onSubmit={save} noValidate>
            <Field label="Name" error={errs.name}><input className="input" value={ed.name} disabled={Boolean(ed.id)} onChange={(e) => setEd({ ...ed, name: e.target.value })} /></Field>
            <Field label="Email" error={errs.email}><input className="input" type="email" value={ed.email} disabled={Boolean(ed.id)} onChange={(e) => setEd({ ...ed, email: e.target.value })} /></Field>
            <Field label="Role"><select className="input" value={ed.role} onChange={(e) => setEd({ ...ed, role: e.target.value as Role })} disabled={ed.userId === user!.id && myRole === 'owner'}>{roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>
            {ed.id && <Field label="Status"><select className="input" value={ed.status} onChange={(e) => setEd({ ...ed, status: e.target.value as MemberStatus })} disabled={ed.userId === user!.id}>{(['active', 'invited', 'suspended'] as const).map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>}
            {!ed.id && <p className="mb-3 text-xs text-slate-500">New users get the demo password <code>demo123</code>.</p>}
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setEd(null)}>Cancel</button><button className="btn-primary">Save</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
