import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthAPI, AuthUser } from '../services/api';

export type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
};

export type AuthContextType = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
  hasPermission: (perm: string) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize CSRF and session
    (async () => {
      try {
        await AuthAPI.csrf();
        const me = await AuthAPI.me();
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await AuthAPI.csrf();
      const me = await AuthAPI.login(email, password);
      setUser(me);
    } catch (e: any) {
      setError(e?.message || 'Falha no login');
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthAPI.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const hasRole = useCallback((...roles: string[]) => {
    if (!user) return false;
    return roles.some((r) => user.roles.includes(r));
  }, [user]);

  const hasPermission = useCallback((perm: string) => {
    if (!user) return false;
    return (user.permissions || []).includes(perm);
  }, [user]);

  const value = useMemo(() => ({ user, loading, error, login, logout, hasRole, hasPermission }), [user, loading, error, login, logout, hasRole, hasPermission]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return null;
  return <>{children}</>;
}

export function RoleGuard({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) return null;
  return <>{children}</>;
}
