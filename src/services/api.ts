/* Simple API client with CSRF support and cookie credentials */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const USE_MOCK = (import.meta.env.VITE_API_MOCK || 'false') === 'true';

function normalizeBaseUrl(url: string): string {
  if (!url) return '';
  return url.replace(/\s+/g, '').replace(/\/+$/, '');
}

const BASE_URL = normalizeBaseUrl(RAW_BASE_URL);

function isAbsoluteUrl(url: string) {
  try {
    return Boolean(new URL(url));
  } catch {
    return false;
  }
}

function buildRequestUrl(path: string): string {
  if (!path) return BASE_URL || '/';
  if (isAbsoluteUrl(path)) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!BASE_URL) return normalizedPath;
  return `${BASE_URL}${normalizedPath}`;
}

function getCsrfToken() {
  // Expect a cookie named `csrf_token` set by backend on GET /auth/csrf
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (USE_MOCK) {
    // Lazy import mock when enabled
    const { mockFetch } = await import('./mockApi');
    return mockFetch<T>(path, options);
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  const csrf = getCsrfToken();
  if (csrf) headers.set('X-CSRF-Token', csrf);

  const targetUrl = buildRequestUrl(path);
  const absoluteUrl = new URL(targetUrl, window.location.origin);
  const sameOrigin = absoluteUrl.origin === window.location.origin;

  let resp: Response;
  try {
    resp = await fetch(absoluteUrl.toString(), {
      ...options,
      headers,
      credentials: options.credentials ?? (sameOrigin ? 'include' : 'omit'),
      mode: options.mode ?? (sameOrigin ? 'same-origin' : 'cors'),
    });
  } catch (error) {
    const method = (options.method || 'GET').toUpperCase();
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${method} ${absoluteUrl.toString()} failed: ${reason}`);
  }

  if (resp.status === 204) return undefined as unknown as T;
  const text = await resp.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Invalid JSON from server');
  }
  if (!resp.ok) {
    const message = data?.message || `HTTP ${resp.status}`;
    throw new Error(message);
  }
  return data as T;
}

// Auth endpoints
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions?: string[];
};

export const AuthAPI = {
  csrf: () => apiFetch<void>('/auth/csrf', { method: 'GET' }),
  me: () => apiFetch<AuthUser>('/auth/me', { method: 'GET' }),
  login: (email: string, password: string) =>
    apiFetch<AuthUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
  refresh: () => apiFetch<AuthUser>('/auth/refresh', { method: 'POST' }),
  forgotPassword: (email: string) =>
    apiFetch<void>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};

// Contracts endpoints
export type ContractsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  cnpj?: string;
  status?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
};

export type ContractSummary = {
  id: string;
  cliente: string;
  cnpj: string;
  uc: string;
  status: 'ativo' | 'inativo' | 'pendente';
  ciclo: string; // YYYY-MM
  energiaContratadaMWh: number;
  energiaUtilizadaMWh: number;
  flexibilidadePct: number;
  excedenteMWh: number;
  custoExtra: number; // calculado quando excede flex
};

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export const ContractsAPI = {
  list: (q: ContractsQuery) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });
    return apiFetch<Paged<ContractSummary>>(`/contracts?${params.toString()}`, { method: 'GET' });
  },
};
