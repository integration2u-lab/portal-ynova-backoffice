import { Cliente } from '../types';
import { mockClientes } from '../data/mockData';

const DEFAULT_BFF_URL = 'https://n8n.ynovamarketplace.com/webhook-test/mockScde';

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
    parseNumber(raw?.consumoKwh);
  const geracao =
    parseNumber(raw?.geracao) ||
    parseNumber(raw?.geracao_kwh) ||
    parseNumber(raw?.geracaoKwh);
  const balancoRaw =
    parseNumber(raw?.balanco) ||
    parseNumber(raw?.saldoEnergetico) ||
    parseNumber(raw?.saldo);

  const idValue = raw?.id ?? raw?.clienteId ?? raw?.leadId ?? index + 1;
  const id = Number.parseInt(String(idValue), 10);

  const nome =
    raw?.nome ??
    raw?.name ??
    raw?.razaoSocial ??
    raw?.cliente ??
    `Cliente ${index + 1}`;

  const bandeira = raw?.bandeira ?? raw?.flag ?? raw?.tarifaBandeira ?? 'Sem bandeira';

  const impostoValue =
    raw?.imposto ??
    raw?.impostoPercentual ??
    raw?.aliquota ??
    raw?.aliquotaExtra ??
    raw?.taxa ??
    raw?.percentualImposto ??
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

function extractClientes(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.clientes)) return payload.clientes;
  if (Array.isArray(payload?.data?.clientes)) return payload.data.clientes;
  if (Array.isArray(payload?.data?.simulation?.clientes)) return payload.data.simulation.clientes;
  if (Array.isArray(payload?.simulation?.clientes)) return payload.simulation.clientes;
  if (Array.isArray(payload?.result?.clientes)) return payload.result.clientes;
  return [];
}

export type LeadSimulationResponse = {
  clientes: Cliente[];
  fromCache: boolean;
  error?: string;
};

export async function fetchLeadSimulationClientes(signal?: AbortSignal): Promise<LeadSimulationResponse> {
  const endpoint = import.meta.env.VITE_BFF_LEADS_URL || DEFAULT_BFF_URL;

  try {
    const response = await fetch(endpoint, { signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json();
    const rawClientes = extractClientes(json);
    if (!Array.isArray(rawClientes) || rawClientes.length === 0) {
      throw new Error('Resposta sem clientes');
    }
    const clientes = rawClientes.map((item, index) => normalizeCliente(item, index));
    return { clientes, fromCache: false };
  } catch (error) {
    console.error('Erro ao buscar mock do BFF', error);
    return {
      clientes: mockClientes,
      fromCache: true,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
