import { Cliente } from '../types';
import { mockClientes } from '../data/mockData';

type FetchOptions = {
  signal?: AbortSignal;
};

export type LeadSimulationResponse = {
  clientes: Cliente[];
  fromCache: boolean;
  error?: string;
};

const DEFAULT_BFF_URL = 'https://657285488d18.ngrok-free.app';

let lastResult: LeadSimulationResponse | null = null;
let lastRemoteClientes: Cliente[] | null = null;

function parseNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value
      .replace(/[^0-9.,-]/g, '')
      .replace(/,(?=\d{3}(?:\D|$))/g, '.')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function ensurePercent(value: unknown): string {
  if (typeof value === 'string') {
    return value.includes('%') ? value : `${value}%`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value}%`;
  }
  return '0%';
}

function normalizeCliente(raw: any, index: number): Cliente {
  const consumo =
    parseNumber(raw?.consumo) ||
    parseNumber(raw?.consumo_kwh) ||
    parseNumber(raw?.consumoKwh) ||
    parseNumber(raw?.consumoKWh) ||
    parseNumber(raw?.kwh_consumo) ||
    parseNumber(raw?.energiaAtual);
  const geracao =
    parseNumber(raw?.geracao) ||
    parseNumber(raw?.geracao_kwh) ||
    parseNumber(raw?.geracaoKwh) ||
    parseNumber(raw?.geracaoKWh) ||
    parseNumber(raw?.kwh_geracao) ||
    parseNumber(raw?.energiaGerada);
  const balancoRaw =
    parseNumber(raw?.balanco) ||
    parseNumber(raw?.saldoEnergetico) ||
    parseNumber(raw?.saldo) ||
    parseNumber(raw?.balancoEnergetico) ||
    parseNumber(raw?.economiaMigracao?.saldoEnergetico) ||
    parseNumber(raw?.economiaMigracao?.saldoEnergeticoKWh);

  const idValue = raw?.id ?? raw?.clienteId ?? raw?.leadId ?? raw?.codigo ?? index + 1;
  const id = Number.parseInt(String(idValue), 10);

  const nome =
    raw?.nome ??
    raw?.name ??
    raw?.razaoSocial ??
    raw?.cliente ??
    raw?.empresa ??
    `Cliente ${index + 1}`;

  const bandeira =
    raw?.bandeira ??
    raw?.flag ??
    raw?.tarifaBandeira ??
    raw?.categoria ??
    'Sem bandeira';

  const impostoValue =
    raw?.imposto ??
    raw?.impostoPercentual ??
    raw?.aliquota ??
    raw?.aliquotaExtra ??
    raw?.taxa ??
    raw?.percentualImposto ??
    raw?.impostoExtra ??
    raw?.impostos?.aliquotaExtra ??
    '0%';

  const imposto = ensurePercent(impostoValue);

  const balanco = balancoRaw || geracao - consumo;

  return {
    id: Number.isFinite(id) ? id : index + 1,
    nome,
    bandeira,
    imposto,
    consumo,
    geracao,
    balanco,
  };
}

function isClienteLike(value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  const keys = Object.keys(value).map((key) => key.toLowerCase());
  const hasNome = keys.some((key) =>
    ['nome', 'name', 'cliente', 'razaosocial', 'empresa', 'fantasia'].includes(key)
  );
  const hasConsumo = keys.some((key) =>
    ['consumo', 'consumo_kwh', 'consumokwh', 'kwh_consumo', 'energiaatual'].includes(key)
  );
  const hasGeracaoOuSaldo = keys.some((key) =>
    [
      'geracao',
      'geracao_kwh',
      'geracaokwh',
      'kwh_geracao',
      'energiagerada',
      'saldo',
      'saldoenergetico',
      'saldoenergeticokwh',
      'balanco',
      'balancoenergetico',
    ].includes(key)
  );
  return hasNome && (hasConsumo || hasGeracaoOuSaldo);
}

function tryParseJsonString(text: string): any {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const tryParse = (value: string) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  let parsed = tryParse(trimmed);
  if (parsed !== null) return parsed;

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const unescaped = tryParse(trimmed);
    if (typeof unescaped === 'string') {
      parsed = tryParse(unescaped);
      if (parsed !== null) return parsed;
      return unescaped;
    }
  }

  return null;
}

function extractClientes(payload: any): any[] {
  const visited = new Set<any>();

  const search = (value: any): any[] => {
    if (!value) return [];

    if (Array.isArray(value)) {
      const candidates = value.filter(isClienteLike);
      if (candidates.length > 0) return candidates;
      for (const item of value) {
        const nested = search(item);
        if (nested.length > 0) return nested;
      }
      return [];
    }

    if (typeof value === 'string') {
      const parsed = tryParseJsonString(value);
      if (parsed !== null) {
        return search(parsed);
      }
      return [];
    }

    if (typeof value === 'object') {
      if (visited.has(value)) return [];
      visited.add(value);

      if (isClienteLike(value)) {
        return [value];
      }

      const objectValues = Object.values(value);
      const directClientes = objectValues.filter(isClienteLike);
      if (directClientes.length > 0) return directClientes as any[];

      const preferredKeys = [
        'clientes',
        'lista',
        'listaclientes',
        'dadosclientes',
        'clientesenergia',
        'leadclientes',
        'items',
        'rows',
        'entries',
        'result',
        'data',
        'payload',
        'body',
        'response',
        'simulation',
        'leadsimulation',
        'balanco',
      ];

      for (const [key, nestedValue] of Object.entries(value)) {
        const normalizedKey = key.toLowerCase();
        if (preferredKeys.includes(normalizedKey)) {
          const nested = search(nestedValue);
          if (nested.length > 0) return nested;
        }
      }

      for (const nestedValue of objectValues) {
        const nested = search(nestedValue);
        if (nested.length > 0) return nested;
      }
    }

    return [];
  };

  const result = search(payload);
  return Array.isArray(result) ? result : [];
}

function buildErrorMessage(label: string, error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return `${label}: requisição cancelada`;
  }
  if (error instanceof Error) {
    return `${label}: ${error.message}`;
  }
  return `${label}: erro desconhecido`;
}

async function parseResponsePayload(response: Response): Promise<any> {
  const text = await response.text();
  if (!text.trim()) return null;

  const parsedDirect = tryParseJsonString(text);
  if (parsedDirect !== null) return parsedDirect;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function getCachedLeadSimulationClientes(): LeadSimulationResponse | null {
  return lastResult;
}

export async function fetchLeadSimulationClientes({ signal }: FetchOptions = {}): Promise<LeadSimulationResponse> {
  const endpoint = import.meta.env.VITE_BFF_LEADS_URL || DEFAULT_BFF_URL;
  const preferredMethod = import.meta.env.VITE_BFF_LEADS_METHOD?.toUpperCase();

  const attempts: Array<{ label: string; init: RequestInit }> = [];

  const getAttempt: RequestInit = {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-cache',
  };

  const postAttempt: RequestInit = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: '{}',
    cache: 'no-cache',
  };

  if (preferredMethod === 'POST') {
    attempts.push({ label: 'POST', init: postAttempt });
    attempts.push({ label: 'GET', init: getAttempt });
  } else if (preferredMethod === 'GET') {
    attempts.push({ label: 'GET', init: getAttempt });
    attempts.push({ label: 'POST', init: postAttempt });
  } else {
    attempts.push({ label: 'GET', init: getAttempt }, { label: 'POST', init: postAttempt });
  }

  const attemptErrors: string[] = [];

  for (const attempt of attempts) {
    try {
      const response = await fetch(endpoint, { ...attempt.init, signal });
      if (!response.ok) {
        attemptErrors.push(`${attempt.label}: HTTP ${response.status}`);
        continue;
      }

      const payload = await parseResponsePayload(response);
      const rawClientes = extractClientes(payload);
      if (!Array.isArray(rawClientes) || rawClientes.length === 0) {
        attemptErrors.push(`${attempt.label}: resposta sem clientes válidos`);
        continue;
      }

      const clientes = rawClientes.map((item, index) => normalizeCliente(item, index));
      const result: LeadSimulationResponse = { clientes, fromCache: false };
      lastResult = result;
      lastRemoteClientes = clientes;
      return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      attemptErrors.push(buildErrorMessage(attempt.label, error));
    }
  }

  const fallbackClientes = lastRemoteClientes ?? mockClientes;
  const errorMessage = attemptErrors.length > 0 ? attemptErrors.join(' | ') : 'Não foi possível conectar ao mock BFF';
  const fallbackResult: LeadSimulationResponse = {
    clientes: fallbackClientes,
    fromCache: true,
    error: errorMessage,
  };
  lastResult = fallbackResult;
  return fallbackResult;
}
