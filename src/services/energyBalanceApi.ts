import { API_CONFIG, ENERGY_BALANCE_WEBHOOK_URL } from '../config/api';

// Usar configuração centralizada do arquivo de config
const API_BASE_URL = API_CONFIG.baseURL;
const DEFAULT_WEBHOOK_URL = ENERGY_BALANCE_WEBHOOK_URL;

console.log('[energyBalanceApi] 🚀 Inicializado com URL:', API_BASE_URL);

// const WEBHOOK_RUNTIME_CANDIDATES = [
//   sanitizeBaseCandidate(import.meta.env.DEFAULT_WEBHOOK_URL),
//   sanitizeBaseCandidate(import.meta.env.VITE_ENERGY_BALANCE_WEBHOOK),
//   sanitizeBaseCandidate(import.meta.env.VITE_N8N_BALANCO_WEBHOOK),
//   sanitizeBaseCandidate(import.meta.env.VITE_ENERGY_BALANCE_WEBHOOK_PROXY),
// ]
//   .filter((candidate): candidate is string => candidate !== null && candidate !== undefined)
//   .map((candidate) => candidate || DEFAULT_WEBHOOK_URL);

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

const WEBHOOK_FILE_FIELD_CANDIDATES = ['file', 'csv'] as const;

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
  const url = joinUrl(API_BASE_URL, path);
  console.log(`[energyBalanceApi] 🔗 Chamando: ${url}`);
  
  const headers = new Headers(init.headers);
  
  // Adicionar headers da configuração
  Object.entries(API_CONFIG.headers).forEach(([key, value]) => {
    headers.set(key, value);
  });

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
    console.log(`[energyBalanceApi] ✅ Status: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error(`[energyBalanceApi] ❌ Erro na requisição:`, error);
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Falha ao conectar com a API';
    throw new HttpError(message);
  }

  if (!response.ok) {
    const body = await parseJsonSafely(response);
    const errorMessage =
      (body && typeof body === 'object' && 'error' in body && typeof (body as any).error === 'string'
        ? (body as any).error
        : undefined) || response.statusText || `HTTP ${response.status}`;
    console.error(`[energyBalanceApi] ❌ Resposta com erro: ${response.status} - ${errorMessage}`);
    throw new HttpError(errorMessage, { status: response.status, body });
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    console.log(`[energyBalanceApi] 📦 Dados recebidos:`, Array.isArray(data) ? `Array com ${data.length} itens` : typeof data);
    
    // Log detalhado do primeiro item para debug
    if (Array.isArray(data) && data.length > 0) {
      console.log('[energyBalanceApi] 🔍 Primeiro item da resposta:', data[0]);
    } else if (!Array.isArray(data) && typeof data === 'object') {
      console.log('[energyBalanceApi] 🔍 Objeto recebido:', data);
    }
    
    return data as T;
  }

  const data = await parseJsonSafely(response);
  console.log(`[energyBalanceApi] 📦 Dados parseados:`, Array.isArray(data) ? `Array com ${(data as any[]).length} itens` : typeof data);
  return data as T;
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
  // Read the file as base64 and send JSON payload matching the required model
  const readFileAsBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
      reader.onload = () => {
        const result = reader.result as string | ArrayBuffer | null;
        if (!result) return resolve('');
        // result when reading as data URL: data:<mime>;base64,<data>
        if (typeof result === 'string') {
          const idx = result.indexOf('base64,');
          if (idx >= 0) return resolve(result.slice(idx + 7));
          return resolve(result);
        }
        // ArrayBuffer -> convert to base64
        const bytes = new Uint8Array(result as ArrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        try {
          // btoa may fail on very large payloads; still we attempt it here
          return resolve(btoa(binary));
        } catch (e) {
          return reject(e);
        }
      };
      reader.readAsDataURL(f);
    });

  let lastError: unknown = null;

  const url = DEFAULT_WEBHOOK_URL;
  const sameOrigin = isSameOriginUrl(url);

  try {
    const fileDataBase64 = await readFileAsBase64(file);

    const payload = {
      body: {
        filename: file.name,
        fileData: fileDataBase64,
      },
      webhookUrl: url,
    };

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload.body),
      headers: {
        'content-type': 'application/json',
      },
      credentials: sameOrigin ? 'include' : 'omit',
      mode: sameOrigin ? 'same-origin' : 'cors',
    });

    if (!response.ok) {
      const body = await parseJsonSafely(response);
      const message =
        (body && typeof body === 'object' && 'error' in body && typeof (body as any).error === 'string'
          ? (body as any).error
          : undefined) || response.statusText || 'Erro ao enviar planilha';
      const httpError = new HttpError(message, { status: response.status, body });

      if (httpError.status && shouldRetryStatus(httpError.status)) {
        lastError = httpError;
      } else {
        // For 4xx errors keep lastError so caller can inspect
        lastError = httpError;
      }
    } else {
      const data = await parseJsonSafely(response);
      if (!data || typeof data !== 'object') return {};
      const record = data as Record<string, unknown>;
      const balanceId = record.balanceId || (record.data as Record<string, unknown> | undefined)?.balanceId;
      const jobId = record.jobId || (record.data as Record<string, unknown> | undefined)?.jobId;

      return {
        balanceId: balanceId == null ? undefined : String(balanceId),
        jobId: jobId == null ? undefined : String(jobId),
      };
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    if (shouldRetryError(error)) lastError = error;
    else lastError = error;
  }

  if (lastError instanceof HttpError) throw lastError;
  if (lastError instanceof Error) throw new HttpError(lastError.message);
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

export async function triggerBalanceEmailNow(balanceId: string): Promise<void> {
  if (!balanceId) {
    throw new Error('ID do balanço energético é obrigatório para envio imediato de email.');
  }

  const url = ENERGY_BALANCE_WEBHOOK_URL;
  const sameOrigin = isSameOriginUrl(url);
  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ balanceId }),
      credentials: sameOrigin ? 'include' : 'omit',
      mode: sameOrigin ? 'same-origin' : 'cors',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao conectar com o webhook';
    throw new HttpError(message);
  }

  if (!response.ok) {
    const body = await parseJsonSafely(response);
    const errorMessage =
      (body && typeof body === 'object' && 'error' in body && typeof (body as any).error === 'string'
        ? (body as any).error
        : undefined) || response.statusText || `HTTP ${response.status}`;
    throw new HttpError(errorMessage, { status: response.status, body });
  }
}

export { request as energyBalanceRequest, HttpError as EnergyBalanceHttpError };
