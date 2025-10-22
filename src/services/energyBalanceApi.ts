const DEFAULT_BASE_URL = 'http://ec2-18-116-166-24.us-east-2.compute.amazonaws.com:4000';
const DEFAULT_WEBHOOK_URL = 'https://n8n.ynovamarketplace.com/webhook/8d7b84b3-f20d-4374-a812-76db38ebc77d';

const isDev = import.meta.env.DEV;
const useProxy = (import.meta.env.VITE_USE_PROXY ?? 'true') !== 'false';
const runtimeBaseUrl =
  import.meta.env.VITE_ENERGY_BALANCE_API_URL ||
  import.meta.env.VITE_ENERGY_BALANCE_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = (isDev && useProxy ? '' : runtimeBaseUrl) || DEFAULT_BASE_URL;
const WEBHOOK_URL =
  import.meta.env.VITE_ENERGY_BALANCE_WEBHOOK ||
  import.meta.env.VITE_N8N_BALANCO_WEBHOOK ||
  DEFAULT_WEBHOOK_URL;

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

const buildUrl = (path: string) => {
  if (!path.startsWith('/')) {
    return `${API_BASE_URL}/${path}`;
  }
  if (API_BASE_URL.endsWith('/')) {
    return `${API_BASE_URL.slice(0, -1)}${path}`;
  }
  return `${API_BASE_URL}${path}`;
};

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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = init.signal instanceof AbortSignal ? undefined : new AbortController();
  const signal = init.signal ?? controller?.signal;
  const headers = new Headers(init.headers);

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
    signal,
    credentials: init.credentials ?? 'include',
    mode: init.mode ?? 'cors',
  }).catch((error) => {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Falha inesperada ao acessar a API de balanço energético';
    throw new HttpError(message);
  });

  if (!response.ok) {
    const body = await parseJsonSafely(response);
    const errorMessage =
      (body && typeof body === 'object' && 'error' in body && typeof (body as any).error === 'string'
        ? (body as any).error
        : undefined) || response.statusText || `HTTP ${response.status}`;
    throw new HttpError(errorMessage, { status: response.status, body });
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await parseJsonSafely(response)) as T;
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
  if (!WEBHOOK_URL) {
    throw new Error('Endpoint de webhook do n8n não configurado');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('csv', file);

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    body: formData,
  }).catch((error) => {
    const message = error instanceof Error ? error.message : 'Falha ao enviar planilha para o webhook';
    throw new HttpError(message);
  });

  if (!response.ok) {
    const payload = await parseJsonSafely(response);
    const message =
      (payload && typeof payload === 'object' && 'error' in payload && typeof (payload as any).error === 'string'
        ? (payload as any).error
        : undefined) || response.statusText || 'Erro ao enviar planilha';
    throw new HttpError(message, { status: response.status, body: payload });
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
