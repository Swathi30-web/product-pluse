import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, errMsg } from '../lib/api';
import type { User } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { Field } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverErr, setServerErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { data: demoUsers } = useAsync(() => api.list<User>('users'), []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'Enter a valid email address';
    if (!password) er.password = 'Password is required';
    setErrors(er); setServerErr('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try { await login(email, password); nav(loc.state?.from || '/', { replace: true }); }
    catch (x) { setServerErr(errMsg(x)); } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-center text-3xl font-extrabold text-brand">ProductPulse</h1>
        <p className="mb-6 text-center text-slate-500">Customer feedback & product roadmap</p>
        <form onSubmit={submit} className="card" noValidate>
          {serverErr && <div role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverErr}</div>}
          <Field label="Email" error={errors.email}><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></Field>
          <Field label="Password" error={errors.password}><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        {demoUsers && (
          <div className="card mt-4 text-sm">
            <p className="mb-2 font-medium">Demo accounts <span className="font-normal text-slate-500">(password: demo123)</span></p>
            <div className="flex flex-wrap gap-2">
              {demoUsers.map((u) => <button key={u.id} type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={() => { setEmail(u.email); setPassword('demo123'); }}>{u.name}</button>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
