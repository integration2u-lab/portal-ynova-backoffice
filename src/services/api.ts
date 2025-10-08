/* Simple API client with CSRF support and cookie credentials */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const USE_MOCK = (import.meta.env.VITE_API_MOCK || 'false') === 'true';

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
  const csrf = getCsrfToken();
  if (csrf) headers.set('X-CSRF-Token', csrf);

  const resp = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

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

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/\s/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const toPercentNumber = (value: unknown): number => {
  const numeric = toNumber(value, 0);
  if (!numeric) return 0;
  const ratio = Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
  return Number(ratio.toFixed(2));
};

const normalizeStatus = (value: unknown): ContractSummary['status'] => {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (['ativo', 'active', 'actives'].includes(text)) return 'ativo';
  if (['inativo', 'inactive'].includes(text)) return 'inativo';
  if (['pendente', 'pending'].includes(text)) return 'pendente';
  return 'ativo';
};

const mapContractSummary = (raw: unknown, index: number): ContractSummary => {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const id =
    (obj.id as string | undefined) ??
    (obj.contract_code as string | undefined) ??
    (obj.codigoContrato as string | undefined) ??
    (obj.codigo as string | undefined) ??
    `contract-${index + 1}`;

  const clientName =
    (obj.client_name as string | undefined) ??
    (obj.cliente as string | undefined) ??
    (obj.client as string | undefined) ??
    'Cliente não informado';

  const billingCycle =
    (obj.billing_cycle as string | undefined) ??
    (obj.cicloFaturamento as string | undefined) ??
    (obj.ciclo as string | undefined) ??
    (obj.periodo as string | undefined) ??
    (typeof obj.start_date === 'string' ? obj.start_date.slice(0, 7) : undefined) ??
    '';

  const contracted = toNumber(obj.contracted_volume_mwh ?? obj.energiaContratadaMWh ?? obj.energiaContratada ?? 0, 0);
  const utilized =
    toNumber(
      obj.energy_used_mwh ??
        obj.energiaUtilizadaMWh ??
        obj.energiaUtilizada ??
        obj.consumo ??
        obj.volumeUtilizado ??
        contracted,
      contracted
    );

  const flex =
    toPercentNumber(
      obj.flexibility_percent ??
        obj.flexibilidadePct ??
        obj.flex ??
        (obj.limiteSuperior !== undefined && obj.limiteInferior !== undefined
          ? (toPercentNumber(obj.limiteSuperior) + toPercentNumber(obj.limiteInferior)) / 2
          : 0)
    );

  const excedente = toNumber(obj.excedenteMWh ?? obj.excedente_mwh ?? 0, 0);
  const extraCost = toNumber(obj.custoExtra ?? obj.extra_cost ?? 0, 0);

  return {
    id: String(id),
    cliente: clientName,
    cnpj: (obj.cnpj as string | undefined) ?? '',
    uc:
      (obj.uc as string | undefined) ??
      (obj.contract_code as string | undefined) ??
      (obj.client_id as string | undefined) ??
      String(id),
    status: normalizeStatus(obj.status),
    ciclo: billingCycle,
    energiaContratadaMWh: contracted,
    energiaUtilizadaMWh: utilized,
    flexibilidadePct: flex,
    excedenteMWh: excedente,
    custoExtra: extraCost,
  };
};

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export const ContractsAPI = {
  list: (q: ContractsQuery) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });
    return apiFetch<Paged<unknown>>(`/contracts?${params.toString()}`, { method: 'GET' }).then((data) =>
      ({
        ...data,
        items: Array.isArray(data.items)
          ? data.items.map((item, index) => mapContractSummary(item, index))
          : [],
      }) as Paged<ContractSummary>
    );
  },
};
