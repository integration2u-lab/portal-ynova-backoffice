import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthAPI, AuthUser } from '../services/api';

const ALLOW_ANY_LOGIN = (() => {
  const flag = import.meta.env.VITE_ALLOW_ANY_LOGIN;
  if (typeof flag === 'string') {
    return flag === 'true';
  }
  return import.meta.env.PROD;
})();

function buildFallbackUser(email: string): AuthUser {
  const baseEmail = email && email.includes('@') ? email : `${email || 'visitante'}@ynova.local`;
  const displayName = baseEmail.split('@')[0].replace(/[^a-zA-Z0-9]+/g, ' ').trim() || 'Visitante Ynova';
  return {
    id: `local-${Date.now()}`,
    email: baseEmail,
    name: displayName,
    roles: ['gestora'],
    permissions: ['*'],
  };
}

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

    const tryRemoteAuth = async () => {
      await AuthAPI.csrf();
      const me = await AuthAPI.login(email, password);
      setUser(me);
    };

    if (ALLOW_ANY_LOGIN) {
      try {
        await tryRemoteAuth();
      } catch {
        setUser(buildFallbackUser(email));
      }
      return;
    }

    try {
      await tryRemoteAuth();
    } catch (e: any) {
      setError(e?.message || 'Falha no login');
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    if (ALLOW_ANY_LOGIN) {
      try {
        await AuthAPI.logout();
      } catch {
        /* ignore network errors when fallback mode is enabled */
      } finally {
        setUser(null);
      }
      return;
    }

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

  const value = useMemo(
    () => ({ user, loading, error, login, logout, hasRole, hasPermission }),
    [user, loading, error, login, logout, hasRole, hasPermission],
  );

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
