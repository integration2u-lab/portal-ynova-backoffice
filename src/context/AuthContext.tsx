import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthAPI, AuthUser } from '../services/api';

const ALLOW_ANY_LOGIN = (() => {
  const flag = import.meta.env.VITE_ALLOW_ANY_LOGIN;
  if (typeof flag === 'string') {
    return flag === 'true';
  }
  // In development mode, allow any login by default
  return import.meta.env.DEV;
})();

const SKIP_LOGIN = (() => {
  const flag = import.meta.env.VITE_SKIP_LOGIN;
  if (typeof flag === 'string') {
    return flag === 'true';
  }
  return false;
})();

console.log('SKIP_LOGIN:', SKIP_LOGIN, 'ALLOW_ANY_LOGIN:', ALLOW_ANY_LOGIN, 'DEV:', import.meta.env.DEV);

const STORAGE_KEY = 'ynova.portal.auth.user';

function loadStoredUser(): AuthUser | null {
  if (SKIP_LOGIN) {
    // Retorna um usuário padrão quando SKIP_LOGIN está ativo
    return buildFallbackUser('parceiro@ynovamarketplace.com.br');
  }
  if (!ALLOW_ANY_LOGIN || typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function persistUser(user: AuthUser | null) {
  if (SKIP_LOGIN || !ALLOW_ANY_LOGIN || typeof window === 'undefined') {
    // Quando SKIP_LOGIN está ativo, sempre persiste o usuário
    if (SKIP_LOGIN && user && typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
    return;
  }
  if (user) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function buildFallbackUser(email: string): AuthUser {
  const baseEmail = email && email.includes('@') ? email : `${email || 'visitante'}@ynovamarketplace.com.br`;
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
  const [user, setUser] = useState<AuthUser | null>(() => loadStoredUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (SKIP_LOGIN) {
        // Pula completamente a autenticação quando SKIP_LOGIN está ativo
        const defaultUser = buildFallbackUser('parceiro@ynovamarketplace.com.br');
        console.log('SKIP_LOGIN ativo - usando usuário padrão:', defaultUser);
        if (!active) return;
        setUser(defaultUser);
        persistUser(defaultUser);
        setLoading(false);
        return;
      }

      try {
        await AuthAPI.csrf();
        const me = await AuthAPI.me();
        if (!active) return;
        setUser(me);
        persistUser(me);
      } catch {
        if (!active) return;
        const fallback = loadStoredUser();
        if (fallback) {
          setUser(fallback);
        } else if (ALLOW_ANY_LOGIN) {
          // Create a default fallback user when ALLOW_ANY_LOGIN is true
          const defaultUser = buildFallbackUser('parceiro@ynovamarketplace.com.br');
          console.log('Creating fallback user:', defaultUser);
          setUser(defaultUser);
          persistUser(defaultUser);
        } else {
          setUser(null);
          persistUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (SKIP_LOGIN) {
      // Quando SKIP_LOGIN está ativo, apenas cria um usuário local sem chamar a API
      const fallback = buildFallbackUser(email);
      setUser(fallback);
      persistUser(fallback);
      return;
    }

    setError(null);

    const tryRemoteAuth = async () => {
      await AuthAPI.csrf();
      const me = await AuthAPI.login(email, password);
      setUser(me);
      persistUser(me);
    };

    if (ALLOW_ANY_LOGIN) {
      try {
        await tryRemoteAuth();
      } catch {
        const fallback = buildFallbackUser(email);
        setUser(fallback);
        persistUser(fallback);
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
    if (SKIP_LOGIN) {
      // Quando SKIP_LOGIN está ativo, apenas limpa o estado local
      setUser(null);
      persistUser(null);
      return;
    }

    if (ALLOW_ANY_LOGIN) {
      try {
        await AuthAPI.logout();
      } catch {
        /* ignore network errors when fallback mode is enabled */
      } finally {
        setUser(null);
        persistUser(null);
      }
      return;
    }

    try {
      await AuthAPI.logout();
    } finally {
      setUser(null);
      persistUser(null);
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
