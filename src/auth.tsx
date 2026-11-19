import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken } from './api.ts';
import type { Role, User } from './types.ts';

interface AuthContext {
  /** Pengguna login. Halaman di balik gerbang login selalu memilikinya; null hanya sebelum login. */
  user: User;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const Ctx = createContext<AuthContext | null>(null);
export const useAuth = () => useContext(Ctx) as AuthContext;

export function AuthProvider({ children }: { children?: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!getToken());

  useEffect(() => {
    if (getToken()) api.get('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
    const onOut = () => setUser(null);
    window.addEventListener('fdp-logout', onOut);
    return () => window.removeEventListener('fdp-logout', onOut);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.post('/auth/login', { email, password });
    setToken(r.token);
    setUser(r.user);
  }, []);
  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* sesi sudah habis */ }
    setToken(null);
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user: user as User, ready, login, logout }}>{children}</Ctx.Provider>;
}

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Super Admin', hr: 'HR', engineering_manager: 'Engineering Manager', tech_lead: 'Tech Lead',
  project_manager: 'Project Manager', client_evaluator: 'Client Evaluator', employee: 'Employee',
};
type MaybeUser = Pick<User, 'role'> | null | undefined;
export const isHR = (u: MaybeUser) => (['super_admin', 'hr'] as string[]).includes(u?.role as string);
export const isMgmt = (u: MaybeUser) => (['super_admin', 'hr', 'engineering_manager'] as string[]).includes(u?.role as string);
export const isReviewer = (u: MaybeUser) => (['super_admin', 'engineering_manager'] as string[]).includes(u?.role as string);
