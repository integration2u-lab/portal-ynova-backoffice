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
  // Novos campos
  submarket?: string | null;
  supplierEmail?: string | null;
  seasonalFlexibilityMinPercentage?: string | number | null;
  seasonalFlexibilityUpperPercentage?: string | number | null;
  // Vencimento da NF
  nf_vencimento_tipo?: 'dias_uteis' | 'dias_corridos' | null;
  nf_vencimento_dias?: number | null;
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
    corporate_name: undefined,
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
    contracted_volume_mwh: coerceNumber(item?.contracted_volume_mwh) ?? null,
    volume_by_year: normalizeVolumeByYear(item?.volume_by_year ?? item?.volumeByYear),
    status: toStringSafe(item?.status),
    energy_source: toStringSafe(item?.energy_source),
    contracted_modality: toStringSafe(item?.contracted_modality),
    start_date: toStringSafe(item?.start_date),
    end_date: toStringSafe(item?.end_date),
    billing_cycle: toStringSafe(item?.billing_cycle),
    upper_limit_percent: coerceNumber(item?.upper_limit_percent) ?? null,
    lower_limit_percent: coerceNumber(item?.lower_limit_percent) ?? null,
    flexibility_percent: coerceNumber(item?.flexibility_percent) ?? null,
    average_price_mwh: coerceNumber(item?.average_price_mwh) ?? null,
    supplier: item?.supplier === undefined ? undefined : item?.supplier === null ? null : toStringSafe(item?.supplier),
    balance_email: item?.balance_email == null ? undefined : item?.balance_email === null ? null : toStringSafe(item?.balance_email),
    billing_email: item?.billing_email == null ? undefined : item?.billing_email === null ? null : toStringSafe(item?.billing_email),
    spot_price_ref_mwh: coerceNumber(item?.spot_price_ref_mwh) ?? null,
    compliance_consumption: toStringSafe(item?.compliance_consumption) ?? null,
    compliance_nf: toStringSafe(item?.compliance_nf) ?? null,
    compliance_invoice: toStringSafe(item?.compliance_invoice) ?? null,
    compliance_charges: toStringSafe(item?.compliance_charges) ?? null,
    compliance_overall: toStringSafe(item?.compliance_overall) ?? null,
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
    // Novos campos
    submarket: item?.submarket == null ? undefined : item?.submarket === null ? null : toStringSafe(item?.submarket),
    supplierEmail: item?.supplierEmail == null ? undefined : item?.supplierEmail === null ? null : toStringSafe(item?.supplierEmail) ?? (item?.billing_email == null ? undefined : item?.billing_email === null ? null : toStringSafe(item?.billing_email)),
    // PRIORIDADE: Busca PRIMEIRO de seasonal_flexibility_min_percentage (campo correto da tabela)
    seasonalFlexibilityMinPercentage: (() => {
      const raw1 = item?.seasonal_flexibility_min_percentage; // PRIORIDADE 1: campo correto da tabela
      const raw2 = item?.seasonal_flexibility_lower;
      const raw3 = item?.seasonalFlexibilityMinPercentage;
      const result = coerceNumber(raw1 ?? raw2 ?? raw3) ?? null;
      console.log('🔍 [contracts.ts] Normalizando seasonalFlexibilityMinPercentage:', {
        raw1_seasonal_flexibility_min_percentage: raw1,
        raw2_seasonal_flexibility_lower: raw2,
        raw3_seasonalFlexibilityMinPercentage: raw3,
        result,
        tipoRaw1: typeof raw1,
        tipoRaw2: typeof raw2,
        tipoRaw3: typeof raw3,
      });
      return result;
    })(),
    // PRIORIDADE: Busca PRIMEIRO de seasonal_flexibility_upper_percentage (campo correto da tabela)
    seasonalFlexibilityUpperPercentage: (() => {
      const raw1 = item?.seasonal_flexibility_upper_percentage; // PRIORIDADE 1: campo correto da tabela
      const raw2 = item?.seasonal_flexibility_upper;
      const raw3 = item?.seasonalFlexibilityUpperPercentage;
      const result = coerceNumber(raw1 ?? raw2 ?? raw3) ?? null;
      console.log('🔍 [contracts.ts] Normalizando seasonalFlexibilityUpperPercentage:', {
        raw1_seasonal_flexibility_upper_percentage: raw1,
        raw2_seasonal_flexibility_upper: raw2,
        raw3_seasonalFlexibilityUpperPercentage: raw3,
        result,
        tipoRaw1: typeof raw1,
        tipoRaw2: typeof raw2,
        tipoRaw3: typeof raw3,
      });
      return result;
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
  const payload = await getJson<ContractsLikePayload | Contract>(collectionPath, {
    signal: options.signal,
  });
  
  const normalized = normalizeContracts(payload);
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
  submarket?: string | null;
  supplierEmail?: string | null;
  seasonalFlexibilityMinPercentage?: string | number | null;
  seasonalFlexibilityUpperPercentage?: string | number | null;
};

const prepareWritePayload = (payload: Partial<CreateContractPayload>) => {
  const supplierValue = typeof payload.supplier === 'string' ? payload.supplier.trim() : payload.supplier;
  const balanceEmailValue = typeof payload.balance_email === 'string' ? payload.balance_email.trim() : payload.balance_email;
  const billingEmailValue = typeof payload.billing_email === 'string' ? payload.billing_email.trim() : payload.billing_email;
  const supplierEmailValue = typeof payload.supplierEmail === 'string' ? payload.supplierEmail.trim() : payload.supplierEmail;
  const legalNameValue = typeof payload.legal_name === 'string' ? payload.legal_name.trim() : payload.legal_name;
  const submarketValue = typeof payload.submarket === 'string' ? payload.submarket.trim() : payload.submarket;
  
  // Processa campos de flexibilidade sazonal (mantém os valores numéricos ou null)
  const seasonalFlexMin = payload.seasonalFlexibilityMinPercentage;
  const seasonalFlexUpper = payload.seasonalFlexibilityUpperPercentage;

  console.log('🔍 [prepareWritePayload] Valores recebidos:', {
    submarketOriginal: payload.submarket,
    submarketProcessed: submarketValue,
    balanceEmailOriginal: payload.balance_email,
    balanceEmailProcessed: balanceEmailValue,
    billingEmailOriginal: payload.billing_email,
    billingEmailProcessed: billingEmailValue,
    supplierEmailOriginal: payload.supplierEmail,
    supplierEmailProcessed: supplierEmailValue,
    seasonalFlexibilityMinPercentage: seasonalFlexMin,
    seasonalFlexibilityUpperPercentage: seasonalFlexUpper,
    nfVencimentoTipo: payload.nf_vencimento_tipo,
    nfVencimentoDias: payload.nf_vencimento_dias,
    price_periods: payload.price_periods ? `STRING (${typeof payload.price_periods === 'string' ? payload.price_periods.length : 'N/A'} chars)` : 'NULL/UNDEFINED',
    periodPrice: payload.periodPrice ? 'EXISTS' : 'NULL/UNDEFINED',
  });

  // Map legal_name to social_reason for API
  // Remove campos antigos que serão substituídos pelos novos nomes
  const { legal_name, balance_email, billing_email, supplierEmail, seasonalFlexibilityMinPercentage, seasonalFlexibilityUpperPercentage, ...rest } = payload;
  const socialReason = legalNameValue === undefined ? undefined : legalNameValue === '' ? null : legalNameValue;

  const finalPayload = {
    ...rest,
    social_reason: socialReason,
    supplier: supplierValue === undefined ? undefined : supplierValue === '' ? null : supplierValue,
    // E-mail do Balanço → email (não balance_email)
    email: balanceEmailValue === undefined ? undefined : balanceEmailValue === '' ? null : balanceEmailValue,
    // E-mail de Faturamento → supplier_email (não billing_email ou supplierEmail)
    supplier_email: billingEmailValue === undefined ? undefined : billingEmailValue === '' ? null : billingEmailValue,
    submarket: submarketValue === undefined ? undefined : submarketValue === '' ? null : submarketValue,
    // Envia em snake_case conforme especificação da API
    seasonal_flexibility_min_percentage: seasonalFlexMin === undefined ? undefined : seasonalFlexMin === '' ? null : seasonalFlexMin,
    seasonal_flexibility_upper_percentage: seasonalFlexUpper === undefined ? undefined : seasonalFlexUpper === '' ? null : seasonalFlexUpper,
    groupName: typeof payload.groupName === 'string' && payload.groupName.trim() ? payload.groupName : 'default',
    // Vencimento da NF - preserva os valores do payload original
    ...(payload.nf_vencimento_tipo !== undefined ? { nf_vencimento_tipo: payload.nf_vencimento_tipo } : {}),
    ...(payload.nf_vencimento_dias !== undefined ? { nf_vencimento_dias: payload.nf_vencimento_dias } : {}),
  };

  console.log('🔍 [prepareWritePayload] Payload final (incluindo vencimento NF):', {
    nf_vencimento_tipo: finalPayload.nf_vencimento_tipo,
    nf_vencimento_dias: finalPayload.nf_vencimento_dias,
    price_periods: (finalPayload as any).price_periods ? `STRING (${typeof (finalPayload as any).price_periods === 'string' ? (finalPayload as any).price_periods.length : 'N/A'} chars)` : 'NULL/UNDEFINED',
    periodPrice: (finalPayload as any).periodPrice ? 'EXISTS' : 'NULL/UNDEFINED',
  });

  return finalPayload;
};

export async function createContract(payload: CreateContractPayload): Promise<Contract> {
  const preparedPayload = prepareWritePayload(payload);
  console.log('🚀 [ENVIO CONTRATO MANUAL] Payload final que será enviado ao salvar contrato:', JSON.stringify(preparedPayload, null, 2));
  
  try {
    const response = await postJson<ContractsLikePayload | Contract>(collectionPath, preparedPayload);
    const normalized = normalizeContracts(response);
    const created = normalized[0] ?? normalizeContract(payload, 0);
    console.log('✅ [ENVIO CONTRATO MANUAL] Contrato criado com sucesso! Resposta da API:', JSON.stringify(created, null, 2));
    return created;
  } catch (error) {
    console.error('❌ [ENVIO CONTRATO MANUAL] Erro ao criar contrato:', error);
    throw error;
  }
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
