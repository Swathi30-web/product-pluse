import { createContext, ReactNode, useContext, useState } from 'react';
import { api } from '../lib/api';
import type { User } from '../lib/types';

interface Ctx { user: User | null; login: (email: string, password: string) => Promise<void>; logout: () => void }
const AuthCtx = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('pp_user') || 'null'); } catch { return null; }
  });
  const login = async (email: string, password: string) => {
    const found = await api.list<User>('users', { email: email.trim().toLowerCase(), password });
    if (!found.length) throw new Error('Invalid email or password');
    const { password: _pw, ...safe } = found[0];
    localStorage.setItem('pp_user', JSON.stringify(safe));
    setUser(safe);
  };
  const logout = () => { localStorage.removeItem('pp_user'); setUser(null); };
  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}
