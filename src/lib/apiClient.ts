const isDev = import.meta.env.DEV;
const useProxy = (import.meta.env.VITE_USE_PROXY ?? 'true') !== 'false';
// URL base padrão para API de contratos
const DEFAULT_API_BASE_URL = 'api-balanco.ynovamarketplace.com/api';
// URL ngrok para testes
const NGROK_API_BASE_URL = 'https://f2336283d9e5.ngrok-free.app';
const BASE_URL = isDev && useProxy ? '' : (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL);

type ApiFetchOptions = RequestInit & {
  /**
   * When provided, allows callers to override the request body before sending.
   * Mostly useful for helper wrappers.
   */
  body?: BodyInit | null;
};

const isBodyInit = (value: unknown): value is BodyInit => {
  if (value == null) return false;
  if (typeof value === 'string') return true;
  if (value instanceof FormData) return true;
  if (value instanceof Blob) return true;
  if (value instanceof ArrayBuffer) return true;
  if (ArrayBuffer.isView(value)) return true;
  if (value instanceof URLSearchParams) return true;
  if (typeof ReadableStream !== 'undefined' && value instanceof ReadableStream) return true;
  return false;
};

const buildUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Para endpoints de contratos, usa a URL ngrok para testes
  if (normalizedPath.startsWith('/contracts')) {
    return `${NGROK_API_BASE_URL}${normalizedPath}`;
  }
  
  return `${BASE_URL}${normalizedPath}`;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers ?? {});

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  
  // Adiciona header para ngrok não bloquear
  if (path.startsWith('/contracts')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }

  let body: BodyInit | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    if (isBodyInit(options.body)) {
      body = options.body;
      const shouldSetContentType =
        !(options.body instanceof FormData) &&
        !(options.body instanceof Blob) &&
        !(options.body instanceof URLSearchParams) &&
        typeof options.body !== 'string' &&
        !headers.has('Content-Type');
      if (shouldSetContentType) {
        headers.set('Content-Type', 'application/json');
      }
    } else if (options.body != null) {
      body = JSON.stringify(options.body);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }
  }

  const requestInit: RequestInit = {
    ...options,
    method,
    headers,
    body,
    credentials: options.credentials ?? 'omit',
    mode: options.mode ?? 'cors',
  };

  const url = buildUrl(path);
  let response: Response;
  try {
    response = await fetch(url, requestInit);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`[apiClient] Falha de rede ao acessar ${path}: ${error.message}`, { cause: error });
    }
    throw new Error(`[apiClient] Falha de rede ao acessar ${path}`);
  }

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    const snippet = payload ? payload.slice(0, 200) : '';
    const details = snippet ? `: ${snippet}` : '';
    throw new Error(`HTTP ${response.status} ao acessar ${path}${details}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export function getJson<T>(path: string, init: Omit<ApiFetchOptions, 'method' | 'body'> = {}) {
  return apiFetch<T>(path, { ...init, method: 'GET', body: undefined });
}

export function postJson<T>(path: string, body: unknown, init: Omit<ApiFetchOptions, 'method' | 'body'> = {}) {
  const jsonBody = body === undefined ? undefined : JSON.stringify(body);
  const headers: HeadersInit = {
    ...(init.headers ?? {}),
    ...(jsonBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
  };
  return apiFetch<T>(path, {
    ...init,
    method: 'POST',
    body: jsonBody,
    headers,
  });
}

export function putJson<T>(path: string, body: unknown, init: Omit<ApiFetchOptions, 'method' | 'body'> = {}) {
  const jsonBody = body === undefined ? undefined : JSON.stringify(body);
  const headers: HeadersInit = {
    ...(init.headers ?? {}),
    ...(jsonBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
  };
  return apiFetch<T>(path, {
    ...init,
    method: 'PUT',
    body: jsonBody,
    headers,
  });
}

export function patchJson<T>(path: string, body: unknown, init: Omit<ApiFetchOptions, 'method' | 'body'> = {}) {
  const jsonBody = body === undefined ? undefined : JSON.stringify(body);
  const headers: HeadersInit = {
    ...(init.headers ?? {}),
    ...(jsonBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
  };
  return apiFetch<T>(path, {
    ...init,
    method: 'PATCH',
    body: jsonBody,
    headers,
  });
}

export function deleteRequest<T>(path: string, init: Omit<ApiFetchOptions, 'method' | 'body'> = {}) {
  return apiFetch<T>(path, { ...init, method: 'DELETE', body: undefined });
}

export { BASE_URL };
