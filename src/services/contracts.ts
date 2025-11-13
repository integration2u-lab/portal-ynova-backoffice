import { deleteRequest, getJson, patchJson, postJson, putJson } from '../lib/apiClient';

export type ContractVolumeByYear = {
  year: string; // YYYY
  volume: number; // MWh
  price: number; // R$/MWh
  load_percentage: number; // Percentual de carga
};

export type Contract = {
  id: string;
  contract_code: string;
  corporate_name?: string;
  client_name: string;
  legal_name?: string; // Razão social do cliente
  client_id?: string;
  groupName?: string;
  cnpj: string;
  segment: string;
  contact_responsible: string;
  contracted_volume_mwh: string | number | null;
  // Volume contratado desmembrado por ano
  volume_by_year?: ContractVolumeByYear[];
  status: string;
  energy_source: string;
  contracted_modality: string;
  start_date: string;
  end_date: string;
  billing_cycle: string;
  upper_limit_percent?: string | number | null;
  lower_limit_percent?: string | number | null;
  flexibility_percent?: string | number | null;
  average_price_mwh?: string | number | null;
  supplier?: string | null;
  // Removido proinfa_contribution - agora está apenas no Balanço Energético
  // E-mails atrelados ao contrato
  balance_email?: string | null; // E-mail do balanço (para envio de relatórios)
  billing_email?: string | null; // E-mail de faturamento (obrigatório para atacado)
  spot_price_ref_mwh?: string | number | null;
  compliance_consumption?: string | number | null;
  compliance_nf?: string | number | null;
  compliance_invoice?: string | number | null;
  compliance_charges?: string | number | null;
  compliance_overall?: string | number | null;
  // Preços por período (JSON string)
  price_periods?: string | null; // JSON string com a estrutura de períodos e meses
  flat_price_mwh?: string | number | null; // Preço flat aplicado
  flat_years?: string | number | null; // Número de anos para preço flat (1-10)
  created_at: string;
  updated_at: string;
};

type ContractsLikePayload =
  | Contract[]
  | { data?: unknown }
  | { contracts?: unknown }
  | { items?: unknown }
  | { result?: unknown };

type ListOptions = {
  signal?: AbortSignal;
};

const collectionPath = '/contracts';

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const candidates = ['contracts', 'data', 'items', 'result'];
    for (const candidate of candidates) {
      const nested = (value as Record<string, unknown>)[candidate];
      if (Array.isArray(nested)) return nested;
      if (nested && typeof nested === 'object') {
        const nestedItems = (nested as Record<string, unknown>).items;
        if (Array.isArray(nestedItems)) return nestedItems;
      }
    }
  }
  return [];
};

const toStringSafe = (value: unknown, fallback = ''): string => {
  if (value === undefined || value === null) return fallback;
  return String(value);
};

const normalizeContract = (raw: unknown, index: number): Contract => {
  const item = raw as Record<string, unknown> | undefined;
  const idSource = item?.id ?? item?.contract_code ?? index;

  const coerceNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  };

  // Normalize volume_by_year if present
  const normalizeVolumeByYear = (value: unknown): ContractVolumeByYear[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    return value.map((item: unknown) => {
      const v = item as Record<string, unknown>;
      return {
        year: toStringSafe(v?.year ?? v?.ano),
        volume: coerceNumber(v?.volume ?? v?.volume_mwh) ?? 0,
        price: coerceNumber(v?.price ?? v?.preco ?? v?.average_price_mwh) ?? 0,
        load_percentage: coerceNumber(v?.load_percentage ?? v?.loadPercentage ?? v?.percentual_carga) ?? 0,
      };
    });
  };

  return {
    id: toStringSafe(idSource, `contract-${index}`),
    contract_code: toStringSafe(item?.contract_code),
    corporate_name: corporateName || undefined,
    client_name: toStringSafe(item?.client_name),
    legal_name: (() => {
      // API returns social_reason, but we use legal_name internally
      const socialReason = item?.social_reason;
      const legalName = item?.legal_name;
      const value = socialReason ?? legalName;
      return value == null ? undefined : toStringSafe(value);
    })(),
    client_id: item?.client_id == null ? undefined : toStringSafe(item?.client_id),
    groupName: item?.groupName == null ? undefined : toStringSafe(item?.groupName),
    cnpj: toStringSafe(item?.cnpj),
    segment: toStringSafe(item?.segment),
    contact_responsible: toStringSafe(item?.contact_responsible),
    contracted_volume_mwh: item?.contracted_volume_mwh ?? coerceNumber(item?.contracted_volume_mwh),
    volume_by_year: normalizeVolumeByYear(item?.volume_by_year ?? item?.volumeByYear),
    status: toStringSafe(item?.status),
    energy_source: toStringSafe(item?.energy_source),
    contracted_modality: toStringSafe(item?.contracted_modality),
    start_date: toStringSafe(item?.start_date),
    end_date: toStringSafe(item?.end_date),
    billing_cycle: toStringSafe(item?.billing_cycle),
    upper_limit_percent: item?.upper_limit_percent ?? coerceNumber(item?.upper_limit_percent),
    lower_limit_percent: item?.lower_limit_percent ?? coerceNumber(item?.lower_limit_percent),
    flexibility_percent: item?.flexibility_percent ?? coerceNumber(item?.flexibility_percent),
    average_price_mwh: item?.average_price_mwh ?? coerceNumber(item?.average_price_mwh),
    supplier: item?.supplier === undefined ? undefined : item?.supplier === null ? null : toStringSafe(item?.supplier),
    balance_email: item?.balance_email == null ? undefined : item?.balance_email === null ? null : toStringSafe(item?.balance_email),
    billing_email: item?.billing_email == null ? undefined : item?.billing_email === null ? null : toStringSafe(item?.billing_email),
    spot_price_ref_mwh: item?.spot_price_ref_mwh ?? coerceNumber(item?.spot_price_ref_mwh),
    compliance_consumption: item?.compliance_consumption ?? coerceNumber(item?.compliance_consumption),
    compliance_nf: item?.compliance_nf ?? coerceNumber(item?.compliance_nf),
    compliance_invoice: item?.compliance_invoice ?? coerceNumber(item?.compliance_invoice),
    compliance_charges: item?.compliance_charges ?? coerceNumber(item?.compliance_charges),
    compliance_overall: item?.compliance_overall ?? coerceNumber(item?.compliance_overall),
    // Preços por período (pode vir direto ou dentro de periodPrice)
    price_periods: (() => {
      // Tenta pegar de periodPrice primeiro
      const periodPrice = item?.periodPrice;
      if (periodPrice && typeof periodPrice === 'object') {
        const pricePeriodsFromPeriodPrice = (periodPrice as { price_periods?: unknown }).price_periods;
        if (typeof pricePeriodsFromPeriodPrice === 'string') {
          return pricePeriodsFromPeriodPrice;
        }
      }
      // Se não encontrou em periodPrice, tenta direto
      const pricePeriodsDirect = item?.price_periods;
      return typeof pricePeriodsDirect === 'string' ? pricePeriodsDirect : null;
    })(),
    flat_price_mwh: (() => {
      // Tenta pegar de periodPrice primeiro
      const periodPrice = item?.periodPrice;
      if (periodPrice && typeof periodPrice === 'object') {
        const flatPriceFromPeriodPrice = (periodPrice as { flat_price_mwh?: unknown }).flat_price_mwh;
        if (typeof flatPriceFromPeriodPrice === 'number' && Number.isFinite(flatPriceFromPeriodPrice)) {
          return flatPriceFromPeriodPrice;
        }
      }
      // Se não encontrou em periodPrice, tenta direto
      const flatPriceDirect = item?.flat_price_mwh;
      return typeof flatPriceDirect === 'number' && Number.isFinite(flatPriceDirect) ? flatPriceDirect : null;
    })(),
    flat_years: (() => {
      // Tenta pegar de periodPrice primeiro
      const periodPrice = item?.periodPrice;
      if (periodPrice && typeof periodPrice === 'object') {
        const flatYearsFromPeriodPrice = (periodPrice as { flat_years?: unknown }).flat_years;
        if (typeof flatYearsFromPeriodPrice === 'number' && Number.isFinite(flatYearsFromPeriodPrice)) {
          return flatYearsFromPeriodPrice;
        }
      }
      // Se não encontrou em periodPrice, tenta direto
      const flatYearsDirect = item?.flat_years;
      return typeof flatYearsDirect === 'number' && Number.isFinite(flatYearsDirect) ? flatYearsDirect : null;
    })(),
    created_at: toStringSafe(item?.created_at),
    updated_at: toStringSafe(item?.updated_at),
  };
};

const normalizeContracts = (payload: unknown): Contract[] => {
  if (payload === undefined || payload === null) return [];
  if (Array.isArray(payload)) return payload.map((item, index) => normalizeContract(item, index));

  const possibleArray = asArray(payload);
  if (possibleArray.length) {
    return possibleArray.map((item, index) => normalizeContract(item, index));
  }

  if (typeof payload === 'object') {
    return [normalizeContract(payload, 0)];
  }

  return [];
};

const resourcePath = (id: string) => `${collectionPath}/${id}`;

export async function listContracts(options: ListOptions = {}): Promise<Contract[]> {
  console.log('[services/contracts] listContracts - Iniciando busca em:', collectionPath);
  console.log('[services/contracts] listContracts - URL completa será: https://api-balanco.ynovamarketplace.com/contracts');
  
  const payload = await getJson<ContractsLikePayload | Contract>(collectionPath, {
    signal: options.signal,
  });
  
  console.log('[services/contracts] listContracts - Payload recebido da API:', payload);
  console.log('[services/contracts] listContracts - Tipo do payload:', typeof payload, Array.isArray(payload) ? 'Array' : 'Object');
  
  const normalized = normalizeContracts(payload);
  console.log('[services/contracts] listContracts - Contratos normalizados:', normalized.length, 'itens');
  
  // Log de cada contrato para verificar price_periods
  normalized.forEach((contract, index) => {
    console.log(`[services/contracts] listContracts - Contrato ${index + 1}:`, {
      id: contract.id,
      codigo: contract.contract_code,
      price_periods: contract.price_periods,
      flat_price_mwh: contract.flat_price_mwh,
      flat_years: contract.flat_years,
    });
  });
  
  return normalized;
}

export async function fetchContracts(signal?: AbortSignal) {
  return listContracts({ signal });
}

export async function getContracts(signal?: AbortSignal) {
  return listContracts({ signal });
}

export type CreateContractPayload = Omit<Contract, 'id' | 'created_at' | 'updated_at' | 'client_id'> & {
  periodPrice?: {
    price_periods: string | null;
    flat_price_mwh: number | null;
    flat_years: number | null;
  };
};

const prepareWritePayload = (payload: Partial<CreateContractPayload>) => {
  const supplierValue = typeof payload.supplier === 'string' ? payload.supplier.trim() : payload.supplier;
  const balanceEmailValue = typeof payload.balance_email === 'string' ? payload.balance_email.trim() : payload.balance_email;
  const billingEmailValue = typeof payload.billing_email === 'string' ? payload.billing_email.trim() : payload.billing_email;
  const legalNameValue = typeof payload.legal_name === 'string' ? payload.legal_name.trim() : payload.legal_name;

  // Map legal_name to social_reason for API
  const { legal_name, ...rest } = payload;
  const socialReason = legalNameValue === undefined ? undefined : legalNameValue === '' ? null : legalNameValue;

  return {
    ...rest,
    social_reason: socialReason,
    supplier: supplierValue === undefined ? undefined : supplierValue === '' ? null : supplierValue,
    balance_email: balanceEmailValue === undefined ? undefined : balanceEmailValue === '' ? null : balanceEmailValue,
    billing_email: billingEmailValue === undefined ? undefined : billingEmailValue === '' ? null : billingEmailValue,
    groupName: typeof payload.groupName === 'string' && payload.groupName.trim() ? payload.groupName : 'default',
  };
};

export async function createContract(payload: CreateContractPayload): Promise<Contract> {
  const response = await postJson<ContractsLikePayload | Contract>(collectionPath, prepareWritePayload(payload));
  const normalized = normalizeContracts(response);
  return normalized[0] ?? normalizeContract(payload, 0);
}

export async function updateContract(id: string, payload: Partial<CreateContractPayload>): Promise<Contract> {
  const response = await putJson<ContractsLikePayload | Contract>(resourcePath(id), prepareWritePayload(payload));
  const normalized = normalizeContracts(response);
  const match = normalized.find((contract) => contract.id === id);
  return match ?? normalized[0] ?? normalizeContract({ ...payload, id }, 0);
}

export async function patchContract(id: string, payload: Partial<CreateContractPayload>): Promise<Contract> {
  const response = await patchJson<ContractsLikePayload | Contract>(resourcePath(id), prepareWritePayload(payload));
  const normalized = normalizeContracts(response);
  const match = normalized.find((contract) => contract.id === id);
  return match ?? normalized[0] ?? normalizeContract({ ...payload, id }, 0);
}

export async function deleteContract(id: string): Promise<void> {
  await deleteRequest<void>(resourcePath(id));
}
