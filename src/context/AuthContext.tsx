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

// Função helper para verificar SKIP_LOGIN de forma mais robusta
function getSkipLogin(): boolean {
  try {
    const flag = import.meta.env.VITE_SKIP_LOGIN;
    if (typeof flag === 'string') {
      const result = flag.toLowerCase() === 'true' || flag === '1';
      console.log('[AuthContext] VITE_SKIP_LOGIN:', flag, '->', result);
      return result;
    }
    // Também verifica se está definido como boolean true
    if (flag === true) return true;
    return false;
  } catch (error) {
    console.warn('[AuthContext] Erro ao ler VITE_SKIP_LOGIN:', error);
    return false;
  }
}

const SKIP_LOGIN = getSkipLogin();

console.log('[AuthContext] Configuração:', {
  SKIP_LOGIN,
  ALLOW_ANY_LOGIN,
  DEV: import.meta.env.DEV,
  VITE_SKIP_LOGIN: import.meta.env.VITE_SKIP_LOGIN,
  VITE_ALLOW_ANY_LOGIN: import.meta.env.VITE_ALLOW_ANY_LOGIN,
});

const STORAGE_KEY = 'ynova.portal.auth.user';

function loadStoredUser(): AuthUser | null {
  if (getSkipLogin()) {
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
  const shouldSkipLogin = getSkipLogin();
  if (shouldSkipLogin || !ALLOW_ANY_LOGIN || typeof window === 'undefined') {
    // Quando SKIP_LOGIN está ativo, sempre persiste o usuário
    if (shouldSkipLogin && user && typeof window !== 'undefined') {
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
      // Verifica novamente dentro do useEffect para garantir que funciona na Vercel
      const shouldSkipLogin = getSkipLogin();
      
      if (shouldSkipLogin) {
        // Pula completamente a autenticação quando SKIP_LOGIN está ativo
        const defaultUser = buildFallbackUser('parceiro@ynovamarketplace.com.br');
        console.log('[AuthProvider] SKIP_LOGIN ativo - usando usuário padrão:', defaultUser);
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
    // Aceita qualquer email/senha e cria um usuário local
    // Não tenta chamar a API de autenticação
    console.log('[AuthProvider] Login aceitando qualquer credencial:', { email: email.substring(0, 3) + '***' });
    
    setError(null);
    
    // Cria um usuário local baseado no email fornecido
    const fallback = buildFallbackUser(email || 'usuario@ynovamarketplace.com.br');
    setUser(fallback);
    persistUser(fallback);
    
    // Não lança erros, sempre funciona
    return;
  }, []);

  const logout = useCallback(async () => {
    const shouldSkipLogin = getSkipLogin();
    if (shouldSkipLogin) {
      // Quando SKIP_LOGIN está ativo, apenas limpa o estado local
      console.log('[AuthProvider] Logout com SKIP_LOGIN ativo');
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
