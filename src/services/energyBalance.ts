import { apiFetch } from './api';

const ENERGY_BALANCE_ENDPOINT = '/energy-balance';

export interface EnergyBalance {
  id: string;
  clientName: string;
  price: number | null;
  referenceBase: string;
  supplier: string | null;
  meter: string | null;
  consumptionKwh: string;
  proinfaContribution: string;
  contract: string | null;
  minDemand: number | null;
  maxDemand: number | null;
  cpCode: string | null;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  contractId: string | null;
  contactActive: boolean | null;
}

// Energy Balance API types - matching actual API response
export type EnergyBalanceApiResponse = EnergyBalance & {
  billable?: number | null;
  adjusted?: boolean | null;
};

const expectedEnergyBalanceKeys: Array<keyof EnergyBalance> = [
  'id',
  'clientName',
  'price',
  'referenceBase',
  'supplier',
  'meter',
  'consumptionKwh',
  'proinfaContribution',
  'contract',
  'minDemand',
  'maxDemand',
  'cpCode',
  'createdAt',
  'updatedAt',
  'clientId',
  'contractId',
  'contactActive',
];

const ensureStringField = (record: Record<string, unknown>, key: keyof EnergyBalance): string => {
  const value = record[key as string];
  if (typeof value !== 'string') {
    throw new Error(
      `[EnergyBalanceAPI] Campo "${String(key)}" ausente ou inválido na resposta do balanço energético.`,
    );
  }
  return value;
};

const ensureNullableStringField = (record: Record<string, unknown>, key: keyof EnergyBalance): string | null => {
  const value = record[key as string];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  throw new Error(
    `[EnergyBalanceAPI] Campo "${String(key)}" ausente ou inválido na resposta do balanço energético.`,
  );
};

const ensureNullableNumberField = (record: Record<string, unknown>, key: keyof EnergyBalance): number | null => {
  const value = record[key as string];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  throw new Error(
    `[EnergyBalanceAPI] Campo "${String(key)}" ausente ou inválido na resposta do balanço energético.`,
  );
};

const ensureNullableBooleanField = (record: Record<string, unknown>, key: keyof EnergyBalance): boolean | null => {
  const value = record[key as string];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  throw new Error(
    `[EnergyBalanceAPI] Campo "${String(key)}" ausente ou inválido na resposta do balanço energético.`,
  );
};

const assertEnergyBalancePayload = (payload: unknown): EnergyBalance => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('[EnergyBalanceAPI] Resposta inválida ao carregar balanço energético.');
  }

  const record = payload as Record<string, unknown>;

  const missingKeys = expectedEnergyBalanceKeys.filter(
    key => !Object.prototype.hasOwnProperty.call(record, key),
  );

  if (missingKeys.length > 0) {
    throw new Error(
      `[EnergyBalanceAPI] Resposta do balanço energético não contém os campos esperados: ${missingKeys.join(', ')}`,
    );
  }

  return {
    id: ensureStringField(record, 'id'),
    clientName: ensureStringField(record, 'clientName'),
    price: ensureNullableNumberField(record, 'price'),
    referenceBase: ensureStringField(record, 'referenceBase'),
    supplier: ensureNullableStringField(record, 'supplier'),
    meter: ensureNullableStringField(record, 'meter'),
    consumptionKwh: ensureStringField(record, 'consumptionKwh'),
    proinfaContribution: ensureStringField(record, 'proinfaContribution'),
    contract: ensureNullableStringField(record, 'contract'),
    minDemand: ensureNullableNumberField(record, 'minDemand'),
    maxDemand: ensureNullableNumberField(record, 'maxDemand'),
    cpCode: ensureNullableStringField(record, 'cpCode'),
    createdAt: ensureStringField(record, 'createdAt'),
    updatedAt: ensureStringField(record, 'updatedAt'),
    clientId: ensureStringField(record, 'clientId'),
    contractId: ensureNullableStringField(record, 'contractId'),
    contactActive: ensureNullableBooleanField(record, 'contactActive'),
  };
};

const resolveApiBaseUrl = (): string => {
  const raw = import.meta.env?.VITE_API_BASE_URL;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed) {
      return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
    }
  }
  return '';
};

const buildEnergyBalanceUrl = (base: string, path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) {
    return normalizedPath;
  }
  return `${base}${normalizedPath}`;
};

export type GetEnergyBalanceByIdOptions = {
  signal?: AbortSignal;
};

export async function getById(
  id: string,
  options: GetEnergyBalanceByIdOptions = {},
): Promise<EnergyBalance> {
  if (!id) {
    throw new Error('ID do balanço energético é obrigatório.');
  }

  const baseUrl = resolveApiBaseUrl();
  const path = `${ENERGY_BALANCE_ENDPOINT}/${encodeURIComponent(id)}`;
  const url = buildEnergyBalanceUrl(baseUrl, path);

  console.info('[EnergyBalanceAPI] baseURL resolvido:', baseUrl || '(same-origin)');
  console.info('[EnergyBalanceAPI] GET', url);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      credentials: 'include',
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    console.error('[EnergyBalanceAPI] Falha ao acessar endpoint de balanço energético', error);
    throw new Error('Falha ao acessar o balanço energético solicitado.');
  }

  console.info('[EnergyBalanceAPI] status da resposta:', response.status);

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      console.error('[EnergyBalanceAPI] Resposta JSON inválida recebida', error);
      throw new Error('Resposta inválida da API de balanço energético.');
    }
  }

  console.info('[EnergyBalanceAPI] exemplo de payload recebido:', payload);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in (payload as Record<string, unknown>)
        ? String((payload as Record<string, unknown>).message)
        : `Falha ao carregar balanço energético ${id}: ${response.status}`;
    throw new Error(message);
  }

  return assertEnergyBalancePayload(payload);
}

// Normalized Energy Balance Row for internal use
export type EnergyBalanceRow = {
  id: string;
  meter: string;
  client_id: string;
  contract_id?: string;
  reference_base: string; // YYYY-MM format
  consumption_kwh: number;
  price: number; // R$/MWh
  billable?: number; // R$ - cost of the month when available
  proinfa_contribution: number; // R$
  min_demand?: number; // MWh
  max_demand?: number; // MWh
  adjusted: boolean;
  contact_active: boolean;
  created_at: string;
  updated_at: string;
};

export type EnergyBalanceQuery = {
  contract_id?: string;
  client_id?: string;
  meter?: string;
  reference_base?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  pageSize?: number;
};

export type EnergyBalanceSummary = {
  total_consumption_mwh: number;
  total_cost: number;
  total_proinfa: number;
  average_price: number;
  potential_savings: number;
  contracts_count: number;
  meters_count: number;
};

export type EnergyBalanceGenerationFile = {
  name: string;
  type: string;
  size: number;
  data: string;
};

export type EnergyBalanceGenerationRequest = {
  contract: Record<string, unknown>;
  startMonth: string;
  endMonth: string;
  file: EnergyBalanceGenerationFile;
  requestedAt?: string;
  triggerSource?: string;
};

export type EnergyBalanceGenerationResponse = {
  status: 'queued' | 'processing' | 'completed' | 'error' | string;
  message?: string;
  data?: unknown;
};

export type PagedEnergyBalance = {
  items: EnergyBalanceRow[];
  total: number;
  page: number;
  pageSize: number;
  summary?: EnergyBalanceSummary;
};

// Function to normalize API response to internal format
export function normalizeEnergyBalanceData(apiData: EnergyBalanceApiResponse): EnergyBalanceRow {
  // Convert ISO date to YYYY-MM format
  const referenceBase = new Date(apiData.referenceBase).toISOString().slice(0, 7);
  
  // Convert string numbers to actual numbers
  const consumptionKwh = parseFloat(apiData.consumptionKwh) || 0;
  const proinfaContribution = parseFloat(apiData.proinfaContribution) || 0;
  
  return {
    id: apiData.id,
    meter: apiData.meter ?? 'Não informado',
    client_id: apiData.clientId,
    contract_id: apiData.contractId ?? undefined,
    reference_base: referenceBase,
    consumption_kwh: consumptionKwh,
    price: apiData.price ?? 0,
    billable: apiData.billable ?? undefined,
    proinfa_contribution: proinfaContribution,
    min_demand: apiData.minDemand ?? undefined,
    max_demand: apiData.maxDemand ?? undefined,
    adjusted: apiData.adjusted ?? false,
    contact_active: apiData.contactActive ?? false,
    created_at: apiData.createdAt,
    updated_at: apiData.updatedAt,
  };
}

// Energy Balance API endpoints
export const EnergyBalanceAPI = {
  // Get energy balance data with optional filters
  list: async (query: EnergyBalanceQuery = {}): Promise<PagedEnergyBalance> => {
    const params = new URLSearchParams();
    
    if (query.contract_id) params.append('contract_id', query.contract_id);
    if (query.client_id) params.append('client_id', query.client_id);
    if (query.meter) params.append('meter', query.meter);
    if (query.reference_base) params.append('reference_base', query.reference_base);
    if (query.start_date) params.append('start_date', query.start_date);
    if (query.end_date) params.append('end_date', query.end_date);
    if (query.page) params.append('page', query.page.toString());
    if (query.pageSize) params.append('pageSize', query.pageSize.toString());

    const queryString = params.toString();
    const endpoint = `/energy-balance${queryString ? `?${queryString}` : ''}`;
    
    // The API returns an array directly, not a paged response
  const apiData = await apiFetch<EnergyBalanceApiResponse[]>(endpoint, { method: 'GET', headers: { 'ngrok-skip-browser-warning': 'true' } });
    
    // Normalize the data
    const normalizedItems = apiData.map(normalizeEnergyBalanceData);
    
    // Create a paged response structure
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const total = normalizedItems.length;
    
    return {
      items: normalizedItems,
      total,
      page,
      pageSize,
    };
  },

  getById: async (
    id: string,
    options: GetEnergyBalanceByIdOptions = {},
  ): Promise<EnergyBalance> => getById(id, options),

  // Get energy balance for a specific contract
  getByContract: async (contractId: string, query: Omit<EnergyBalanceQuery, 'contract_id'> = {}): Promise<PagedEnergyBalance> => {
    return EnergyBalanceAPI.list({ ...query, contract_id: contractId });
  },

  // Get energy balance for a specific meter
  getByMeter: async (meter: string, query: Omit<EnergyBalanceQuery, 'meter'> = {}): Promise<PagedEnergyBalance> => {
    return EnergyBalanceAPI.list({ ...query, meter });
  },

  // Get energy balance summary/statistics
  getSummary: async (query: EnergyBalanceQuery = {}): Promise<EnergyBalanceSummary> => {
    // For now, we'll calculate summary from the list data
    // In the future, you might have a dedicated summary endpoint
    const data = await EnergyBalanceAPI.list(query);
    
    const totalConsumptionMwh = data.items.reduce((sum, item) => sum + EnergyBalanceUtils.kwhToMwh(item.consumption_kwh), 0);
    const totalCost = data.items.reduce((sum, item) => sum + EnergyBalanceUtils.calculateCurrentCost(item), 0);
    const totalProinfa = data.items.reduce((sum, item) => sum + item.proinfa_contribution, 0);
    const averagePrice = data.items.length > 0 ? data.items.reduce((sum, item) => sum + item.price, 0) / data.items.length : 0;
    
    // Calculate potential savings (simplified calculation)
    const potentialSavings = data.items.reduce((sum, item) => {
      const currentCost = EnergyBalanceUtils.calculateCurrentCost(item);
      const expectedCost = item.price * EnergyBalanceUtils.kwhToMwh(item.consumption_kwh);
      return sum + EnergyBalanceUtils.calculatePotentialSavings(currentCost, expectedCost);
    }, 0);
    
    const uniqueContracts = new Set(data.items.map(item => item.contract_id).filter(Boolean)).size;
    const uniqueMeters = new Set(data.items.map(item => item.meter)).size;
    
    return {
      total_consumption_mwh: totalConsumptionMwh,
      total_cost: totalCost,
      total_proinfa: totalProinfa,
      average_price: averagePrice,
      potential_savings: potentialSavings,
      contracts_count: uniqueContracts,
      meters_count: uniqueMeters,
    };
  },

  // Create new energy balance entry
  create: async (data: Omit<EnergyBalanceRow, 'id' | 'created_at' | 'updated_at'>): Promise<EnergyBalanceRow> => {
    const apiData = await apiFetch<EnergyBalanceApiResponse>('/energy-balance', {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify(data),
    });
    return normalizeEnergyBalanceData(apiData);
  },

  // Update energy balance entry
  update: async (id: string, data: Partial<EnergyBalanceRow>): Promise<EnergyBalanceRow> => {
    const apiData = await apiFetch<EnergyBalanceApiResponse>(`/energy-balance/${id}`, {
      method: 'PUT',
      headers: { 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify(data),
    });
    return normalizeEnergyBalanceData(apiData);
  },

  // Delete energy balance entry
  delete: async (id: string): Promise<void> => {
    return apiFetch<void>(`/energy-balance/${id}`, {
      method: 'DELETE',
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
  },

  // Trigger energy balance generation workflow via n8n proxy
  triggerGeneration: async (
    payload: EnergyBalanceGenerationRequest,
  ): Promise<EnergyBalanceGenerationResponse> => {
    return apiFetch<EnergyBalanceGenerationResponse>('/energy-balance/generate', {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify(payload),
    });
  },
};

// Utility functions for energy balance calculations
export const EnergyBalanceUtils = {
  // Convert kWh to MWh
  kwhToMwh: (kwh: number): number => kwh / 1000,

  // Calculate current month cost
  calculateCurrentCost: (row: EnergyBalanceRow): number => {
    if (row.billable !== undefined && row.billable !== null) {
      return row.billable;
    }
    return row.price * EnergyBalanceUtils.kwhToMwh(row.consumption_kwh);
  },

  // Calculate contracted volume range (from contract data)
  calculateContractedRange: (contractedVolume: number, lowerLimit: number, upperLimit: number) => {
    return {
      min: contractedVolume * lowerLimit,
      max: contractedVolume * upperLimit,
    };
  },

  // Calculate potential savings
  calculatePotentialSavings: (currentCost: number, expectedCost: number): number => {
    return Math.max(0, currentCost - expectedCost);
  },

  // Format month reference for display
  formatMonthReference: (reference: string): string => {
    const [year, month] = reference.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', {
      month: 'short',
      year: 'numeric',
    }).replace('.', '');
  },

  // Format currency for display
  formatCurrency: (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  },

  // Format MWh for display
  formatMwh: (value: number): string => {
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  },
};
