import { deleteRequest, getJson, patchJson, postJson, putJson } from '../lib/apiClient';

export type Contract = {
  id: string;
  contract_code: string;
  corporate_name?: string;
  client_name: string;
  client_id?: string;
  groupName?: string;
  cnpj: string;
  segment: string;
  contact_responsible: string;
  contracted_volume_mwh: string | number | null;
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
  spot_price_ref_mwh?: string | number | null;
  compliance_consumption?: string | number | null;
  compliance_nf?: string | number | null;
  compliance_invoice?: string | number | null;
  compliance_charges?: string | number | null;
  compliance_overall?: string | number | null;
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

const isDev = import.meta.env.DEV;
const useProxy = (import.meta.env.VITE_USE_PROXY ?? 'true') !== 'false';
const collectionPath = isDev && useProxy ? '/api/contracts' : '/contracts';

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

  const corporateName = toStringSafe(
    item?.corporate_name ?? item?.corporateName ?? item?.razao_social ?? item?.razaoSocial ?? item?.razao
  );

  return {
    id: toStringSafe(idSource, `contract-${index}`),
    contract_code: toStringSafe(item?.contract_code),
    corporate_name: corporateName || undefined,
    client_name: toStringSafe(item?.client_name),
    client_id: item?.client_id == null ? undefined : toStringSafe(item?.client_id),
    groupName: item?.groupName == null ? undefined : toStringSafe(item?.groupName),
    cnpj: toStringSafe(item?.cnpj),
    segment: toStringSafe(item?.segment),
    contact_responsible: toStringSafe(item?.contact_responsible),
    contracted_volume_mwh: item?.contracted_volume_mwh ?? coerceNumber(item?.contracted_volume_mwh),
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
    spot_price_ref_mwh: item?.spot_price_ref_mwh ?? coerceNumber(item?.spot_price_ref_mwh),
    compliance_consumption: item?.compliance_consumption ?? coerceNumber(item?.compliance_consumption),
    compliance_nf: item?.compliance_nf ?? coerceNumber(item?.compliance_nf),
    compliance_invoice: item?.compliance_invoice ?? coerceNumber(item?.compliance_invoice),
    compliance_charges: item?.compliance_charges ?? coerceNumber(item?.compliance_charges),
    compliance_overall: item?.compliance_overall ?? coerceNumber(item?.compliance_overall),
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
  const payload = await getJson<ContractsLikePayload | Contract>(collectionPath, {
    signal: options.signal,
  });
  return normalizeContracts(payload);
}

export async function fetchContracts(signal?: AbortSignal) {
  return listContracts({ signal });
}

export async function getContracts(signal?: AbortSignal) {
  return listContracts({ signal });
}

export type CreateContractPayload = Omit<Contract, 'id' | 'created_at' | 'updated_at' | 'client_id'>;

const prepareWritePayload = (payload: Partial<CreateContractPayload>) => {
  const supplierValue = typeof payload.supplier === 'string' ? payload.supplier.trim() : payload.supplier;
  const corporateNameValue =
    typeof payload.corporate_name === 'string' ? payload.corporate_name.trim() : payload.corporate_name;

  return {
    ...payload,
    corporate_name:
      corporateNameValue === undefined ? undefined : corporateNameValue === '' ? null : corporateNameValue,
    supplier: supplierValue === undefined ? undefined : supplierValue === '' ? null : supplierValue,
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
