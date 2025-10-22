const DEFAULT_REMOTE_BASE_URL = 'http://ec2-18-116-166-24.us-east-2.compute.amazonaws.com:4000';
const DEFAULT_WEBHOOK_URL = 'https://n8n.ynovamarketplace.com/webhook/8d7b84b3-f20d-4374-a812-76db38ebc77d';

const sanitizeBaseCandidate = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === '/') return '';
  return trimmed;
};

const unique = <T,>(items: T[]): T[] => items.filter((value, index) => items.indexOf(value) === index);

const rawBaseCandidates = [
  sanitizeBaseCandidate(import.meta.env.VITE_ENERGY_BALANCE_API_URL),
  sanitizeBaseCandidate(import.meta.env.VITE_ENERGY_BALANCE_BASE_URL),
  sanitizeBaseCandidate(import.meta.env.VITE_API_BASE_URL),
  '/api',
  '',
  DEFAULT_REMOTE_BASE_URL,
].filter((candidate): candidate is string => candidate !== null && candidate !== undefined);

const API_BASE_CANDIDATES = unique(rawBaseCandidates);

const WEBHOOK_RUNTIME_CANDIDATES = [
  sanitizeBaseCandidate(import.meta.env.VITE_ENERGY_BALANCE_WEBHOOK),
  sanitizeBaseCandidate(import.meta.env.VITE_N8N_BALANCO_WEBHOOK),
  sanitizeBaseCandidate(import.meta.env.VITE_ENERGY_BALANCE_WEBHOOK_PROXY),
]
  .filter((candidate): candidate is string => candidate !== null && candidate !== undefined)
  .map((candidate) => candidate || DEFAULT_WEBHOOK_URL);

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const joinUrl = (base: string, path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) {
    return normalizedPath;
  }
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalizedBase}${normalizedPath}`;
};

const isSameOriginUrl = (url: string) => {
  if (!isAbsoluteUrl(url)) {
    return true;
  }
  if (typeof window === 'undefined' || !window?.location) {
    return false;
  }
  try {
    return new URL(url, window.location.origin).origin === window.location.origin;
  } catch (error) {
    console.warn('[energyBalanceApi] Falha ao calcular origem do endpoint', error);
    return false;
  }
};

const dedupeWebhookCandidates = (): string[] => {
  const sameOriginCandidates = API_BASE_CANDIDATES.map((base) => joinUrl(base, '/energy-balance/upload-csv'));
  const merged = [...sameOriginCandidates, ...WEBHOOK_RUNTIME_CANDIDATES, DEFAULT_WEBHOOK_URL];
  return unique(merged);
};

const WEBHOOK_CANDIDATES = dedupeWebhookCandidates();

export type EnergyBalanceJobPollResult = { balanceId: string };

class HttpError extends Error {
  status?: number;
  body?: unknown;

  constructor(message: string, options: { status?: number; body?: unknown } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = options.status;
    this.body = options.body;
  }
}

async function parseJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('[energyBalanceApi] Resposta JSON inválida recebida', error);
    return undefined;
  }
}

const shouldRetryStatus = (status: number) => [404, 405, 502, 503, 504].includes(status);

const shouldRetryError = (error: unknown) => error instanceof TypeError;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let lastError: unknown = null;

  for (const base of API_BASE_CANDIDATES) {
    const url = joinUrl(base, path);
    const headers = new Headers(init.headers);
    const sameOrigin = isSameOriginUrl(url);

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers,
        signal: init.signal,
        credentials: init.credentials ?? (sameOrigin ? 'include' : 'omit'),
        mode: init.mode ?? (sameOrigin ? 'same-origin' : 'cors'),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      if (shouldRetryError(error)) {
        lastError = error;
        continue;
      }
      const message = error instanceof Error ? error.message : 'Falha inesperada ao acessar a API de balanço energético';
      throw new HttpError(message);
    }

    if (!response.ok) {
      const body = await parseJsonSafely(response);
      const errorMessage =
        (body && typeof body === 'object' && 'error' in body && typeof (body as any).error === 'string'
          ? (body as any).error
          : undefined) || response.statusText || `HTTP ${response.status}`;
      const httpError = new HttpError(errorMessage, { status: response.status, body });

      if (httpError.status && shouldRetryStatus(httpError.status)) {
        lastError = httpError;
        continue;
      }

      throw httpError;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    return (await parseJsonSafely(response)) as T;
  }

  if (lastError instanceof HttpError) {
    throw lastError;
  }
  if (lastError instanceof Error) {
    throw new HttpError(lastError.message);
  }
  throw new HttpError('Falha ao acessar a API de balanço energético.');
}

const toArray = (payload: unknown): any[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const candidates = ['data', 'items', 'result', 'balances', 'energyBalances'];
    for (const key of candidates) {
      const value = record[key];
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).items)) {
        return (value as Record<string, unknown>).items as unknown[];
      }
    }
  }
  return [];
};

const toObject = (payload: unknown): Record<string, unknown> | undefined => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return undefined;
};

export async function getList(signal?: AbortSignal): Promise<any[]> {
  const payload = await request<any>('/energy-balance', { method: 'GET', signal });
  return toArray(payload);
}

export async function getById(id: string, signal?: AbortSignal): Promise<any> {
  if (!id) {
    throw new Error('ID do balanço energético é obrigatório');
  }
  const payload = await request<any>(`/energy-balance/${encodeURIComponent(id)}`, { method: 'GET', signal });
  return toObject(payload) ?? { id: String(id) };
}

export async function getEvents(id: string, signal?: AbortSignal): Promise<any[]> {
  if (!id) return [];
  try {
    const payload = await request<any>(`/energy-balance/${encodeURIComponent(id)}/events`, { method: 'GET', signal });
    return toArray(payload);
  } catch (error) {
    if (error instanceof HttpError && (error.status === 404 || error.status === 405)) {
      return [];
    }
    throw error;
  }
}

export async function createFromCsv(file: File): Promise<{ balanceId?: string; jobId?: string }> {
  const buildFormData = () => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('csv', file);
    return formData;
  };

  let lastError: unknown = null;

  for (const candidate of WEBHOOK_CANDIDATES) {
    if (!candidate) continue;

    const url = candidate;
    const sameOrigin = isSameOriginUrl(url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: buildFormData(),
        credentials: sameOrigin ? 'include' : 'omit',
        mode: sameOrigin ? 'same-origin' : 'cors',
      });

      if (!response.ok) {
        const payload = await parseJsonSafely(response);
        const message =
          (payload && typeof payload === 'object' && 'error' in payload && typeof (payload as any).error === 'string'
            ? (payload as any).error
            : undefined) || response.statusText || 'Erro ao enviar planilha';
        const httpError = new HttpError(message, { status: response.status, body: payload });
        if (httpError.status && shouldRetryStatus(httpError.status)) {
          lastError = httpError;
          continue;
        }
        throw httpError;
      }

      const data = await parseJsonSafely(response);
      if (!data || typeof data !== 'object') {
        return {};
      }
      const record = data as Record<string, unknown>;
      const balanceId = record.balanceId || (record.data as Record<string, unknown> | undefined)?.balanceId;
      const jobId = record.jobId || (record.data as Record<string, unknown> | undefined)?.jobId;

      return {
        balanceId: balanceId == null ? undefined : String(balanceId),
        jobId: jobId == null ? undefined : String(jobId),
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      if (shouldRetryError(error)) {
        lastError = error;
        continue;
      }
      const message = error instanceof Error ? error.message : 'Falha ao enviar planilha para o webhook';
      throw new HttpError(message);
    }
  }

  if (lastError instanceof HttpError) {
    throw lastError;
  }
  if (lastError instanceof Error) {
    throw new HttpError(lastError.message);
  }
  throw new HttpError('Não foi possível enviar a planilha para processamento.');
}

export async function pollJob(
  jobId: string,
  onTick?: (status: { attempt: number; elapsedMs: number }) => void,
): Promise<EnergyBalanceJobPollResult> {
  if (!jobId) {
    throw new Error('jobId é obrigatório para o polling');
  }

  const start = Date.now();
  const maxDurationMs = 60_000;
  const intervalMs = 2_000;
  let attempt = 0;

  while (Date.now() - start < maxDurationMs) {
    attempt += 1;
    onTick?.({ attempt, elapsedMs: Date.now() - start });

    try {
      const payload = await request<any>(`/energy-balance/jobs/${encodeURIComponent(jobId)}`, { method: 'GET' });
      const record = toObject(payload) ?? {};
      const balanceIdCandidate =
        record.balanceId ??
        record.balance_id ??
        (record.data && typeof record.data === 'object' && (record.data as Record<string, unknown>).balanceId);

      if (balanceIdCandidate) {
        return { balanceId: String(balanceIdCandidate) };
      }

      const statusText =
        record.status ??
        (record.data && typeof record.data === 'object' && (record.data as Record<string, unknown>).status);
      if (typeof statusText === 'string') {
        const normalized = statusText.toLowerCase();
        if (normalized === 'failed' || normalized === 'error') {
          throw new Error('Processamento do balanço retornou erro.');
        }
      }
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        // If the job is not ready yet, continue polling.
      } else if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      } else {
        const message = error instanceof Error ? error.message : 'Erro inesperado ao consultar o status do processamento.';
        throw new Error(message, { cause: error instanceof Error ? error : undefined });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Tempo limite ao aguardar o processamento do balanço energético.');
}

export { request as energyBalanceRequest, HttpError as EnergyBalanceHttpError };
