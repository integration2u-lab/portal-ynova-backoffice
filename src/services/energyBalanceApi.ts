const ENERGY_BALANCE_API_BASE_URL = 'http://ec2-18-116-166-24.us-east-2.compute.amazonaws.com:4000';
const ENERGY_BALANCE_WEBHOOK_URL =
  'https://n8n.ynovamarketplace.com/webhook/8d7b84b3-f20d-4374-a812-76db38ebc77d';

export type EnergyBalanceListItem = Record<string, unknown>;
export type EnergyBalanceDetail = Record<string, unknown>;

export type EnergyBalanceEvent = {
  id: string;
  type?: string;
  message?: string;
  user?: string;
  created_at?: string;
  [key: string]: unknown;
};

export type CreateFromCsvResult = {
  balanceId?: string;
  jobId?: string;
  [key: string]: unknown;
};

export type PollJobResult = {
  balanceId: string;
};

export type PollJobStatus = {
  status?: string;
  balanceId?: string;
  jobId?: string;
  [key: string]: unknown;
};

type RequestOptions = {
  signal?: AbortSignal;
  query?: Record<string, string | number | undefined>;
};

async function fetchJson<T>(path: string, options: RequestInit & RequestOptions = {}): Promise<T> {
  const { signal, query, headers, ...rest } = options;

  const url = new URL(path, ENERGY_BALANCE_API_BASE_URL);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
    signal,
    credentials: 'include',
  });

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const text = await response.text();
  let payload: unknown = undefined;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      console.error('[energyBalanceApi] resposta inválida', error);
      if (!response.ok) {
        throw new Error(`Erro ao chamar API (${response.status})`);
      }
      throw new Error('Resposta inválida da API de balanço energético.');
    }
  }

  if (!response.ok) {
    const message =
      (payload as { message?: string; error?: string } | undefined)?.message ||
      (payload as { message?: string; error?: string } | undefined)?.error ||
      `Erro ao chamar API (${response.status})`;
    throw new Error(message);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: unknown }).data as T;
  }

  return payload as T;
}

export type GetListOptions = {
  search?: string;
  signal?: AbortSignal;
};

export async function getList(signal?: AbortSignal): Promise<EnergyBalanceListItem[]>;
export async function getList(options?: GetListOptions): Promise<EnergyBalanceListItem[]>;
export async function getList(
  arg?: AbortSignal | GetListOptions,
): Promise<EnergyBalanceListItem[]> {
  let explicitSignal: AbortSignal | undefined;
  let search: string | undefined;

  if (arg) {
    const isAbortSignal =
      typeof arg === 'object' &&
      arg !== null &&
      'aborted' in arg &&
      typeof (arg as AbortSignal).aborted === 'boolean' &&
      typeof (arg as AbortSignal).addEventListener === 'function';

    if (isAbortSignal) {
      explicitSignal = arg as AbortSignal;
    } else if (typeof arg === 'object') {
      const options = arg as GetListOptions;
      explicitSignal = options.signal;
      search = options.search;
    }
  }

  const query: Record<string, string | number | undefined> = {};
  if (search && search.trim()) {
    query.q = search.trim();
  }

  const payload = await fetchJson<
    EnergyBalanceListItem[] | { items?: EnergyBalanceListItem[]; data?: EnergyBalanceListItem[] }
  >('/energy-balance', {
    method: 'GET',
    signal: explicitSignal,
    query,
  });

  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.items)) {
      return payload.items;
    }
    if (Array.isArray(payload.data)) {
      return payload.data;
    }
  }

  return [];
}

export async function getById(id: string, signal?: AbortSignal): Promise<EnergyBalanceDetail> {
  if (!id) {
    throw new Error('ID do balanço energético é obrigatório');
  }

  return fetchJson<EnergyBalanceDetail>(`/energy-balance/${id}`, {
    method: 'GET',
    signal,
  });
}

export async function getEvents(id: string, signal?: AbortSignal): Promise<EnergyBalanceEvent[]> {
  if (!id) {
    throw new Error('ID do balanço energético é obrigatório');
  }

  try {
    return await fetchJson<EnergyBalanceEvent[]>(`/energy-balance/${id}/events`, {
      method: 'GET',
      signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('404') || message.includes('not found')) {
      return [];
    }
    if (error instanceof Error && /endpoint/i.test(error.message)) {
      return [];
    }
    throw error;
  }
}

export async function createFromCsv(file: File): Promise<CreateFromCsvResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('csv', file);

  const response = await fetch(ENERGY_BALANCE_WEBHOOK_URL, {
    method: 'POST',
    body: formData,
  });

  const text = await response.text();
  let payload: Record<string, unknown> = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      console.error('[createFromCsv] resposta inválida do webhook', error);
      payload = {};
    }
  }

  if (!response.ok) {
    const message =
      (payload?.message as string | undefined) ||
      (payload?.error as string | undefined) ||
      `Erro ao enviar CSV (${response.status})`;
    throw new Error(message);
  }

  return payload as CreateFromCsvResult;
}

const delay = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

export async function pollJob(jobId: string, onTick?: (status: PollJobStatus) => void): Promise<PollJobResult> {
  if (!jobId) {
    throw new Error('jobId é obrigatório para polling');
  }

  const maxAttempts = 30; // 60s with 2s interval
  const interval = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await fetchJson<PollJobStatus>(`/energy-balance/jobs/${jobId}`, {
      method: 'GET',
    });

    if (onTick) {
      try {
        onTick({ attempt, ...status });
      } catch (callbackError) {
        console.error('[pollJob] erro no callback onTick', callbackError);
      }
    }

    const balanceId = status?.balanceId || status?.balance_id;
    if (balanceId) {
      return { balanceId: String(balanceId) };
    }

    if (status?.status && typeof status.status === 'string' && status.status.toLowerCase() === 'error') {
      throw new Error('Processamento do balanço energético falhou.');
    }

    await delay(interval);
  }

  throw new Error('Tempo limite excedido para concluir o processamento do balanço energético.');
}
