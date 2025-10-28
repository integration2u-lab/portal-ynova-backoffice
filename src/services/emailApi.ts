import { EnergyBalanceHttpError, energyBalanceRequest, getList } from './energyBalanceApi';

const EMAIL_ENDPOINT_CANDIDATES = [
  '/energy-balance/email'
];

const toArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const directCandidates = ['data', 'items', 'result', 'rows', 'list'];
    for (const key of directCandidates) {
      const value = record[key];
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object') {
        const nested = (value as Record<string, unknown>).items;
        if (Array.isArray(nested)) return nested;
      }
    }
  }
  return [];
};

export async function getEmailRows(signal?: AbortSignal): Promise<unknown[]> {
  let lastError: unknown = null;

  for (const path of EMAIL_ENDPOINT_CANDIDATES) {
    try {
      const payload = await energyBalanceRequest(path, { method: 'GET', signal });
      const array = toArray(payload);
      if (array.length > 0) {
        return array;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      if (
        error instanceof EnergyBalanceHttpError &&
        (error.status === 404 || error.status === 405)
      ) {
        lastError = error;
        continue;
      }
      lastError = error;
      break;
    }
  }

  try {
    const fallback = await getList(signal);
    return Array.isArray(fallback) ? fallback : [];
  } catch (fallbackError) {
    if (fallbackError instanceof Error && fallbackError.name === 'AbortError') {
      throw fallbackError;
    }
    if (lastError instanceof Error) {
      throw lastError;
    }
    throw fallbackError;
  }
}

export async function updateEmailRow(id: string, data: Partial<Record<string, unknown>>, signal?: AbortSignal): Promise<unknown> {
  // Use the correct endpoint based on the API specification
  const path = `/energy-balance/${id}`;

  try {
    const payload = await energyBalanceRequest(path, { 
      method: 'PUT', 
      signal,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(data)
    });
    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Erro ao atualizar o registro';
    throw new Error(message);
  }
}