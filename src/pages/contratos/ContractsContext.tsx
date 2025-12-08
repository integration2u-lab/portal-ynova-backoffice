import React from 'react';
import type { ContractDetails as ContractMock } from '../../types/contracts';
import {
  createContract as createContractService,
  deleteContract as deleteContractService,
  listContracts as listContractsService,
  updateContract as updateContractService,
  type CreateContractPayload,
} from '../../services/contracts';
import { parseContractPricePeriods } from '../../utils/contractPricing';
import { API_BASE_URL } from '../../config/api';
import { getList as getEnergyBalanceList, energyBalanceRequest } from '../../services/energyBalanceApi';

const DEFAULT_API_URL = API_BASE_URL;

const runtimeEnv: Record<string, string | undefined> =
  ((typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    : undefined) ??
    ((typeof globalThis !== 'undefined'
      ? (globalThis as { process?: { env?: Record<string, string | undefined> } })
      : undefined)?.process?.env) ??
    {});

const resolveReadApiUrl = () => {
  const candidates = [
    runtimeEnv.VITE_CONTRACTS_API_URL,
    runtimeEnv.VITE_CONTRACTS_API,
    runtimeEnv.REACT_APP_CONTRACTS_API_URL,
    runtimeEnv.REACT_APP_CONTRACTS_API,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeString(candidate);
    if (normalized) return normalized;
  }

  return DEFAULT_API_URL;
};

const resolveWriteApiUrl = () => {
  const candidates = [
    runtimeEnv.VITE_CONTRACTS_API_WRITE_URL,
    runtimeEnv.VITE_CONTRACTS_API_URL,
    runtimeEnv.VITE_CONTRACTS_API,
    runtimeEnv.REACT_APP_CONTRACTS_API_URL,
    runtimeEnv.REACT_APP_CONTRACTS_API,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeString(candidate);
    if (normalized) return normalized;
  }

  return DEFAULT_API_URL;
};

const resumoKeys: Array<keyof ContractMock['resumoConformidades']> = [
  'Consumo',
  'NF',
  'Fatura',
  'Encargos',
  'Conformidade',
];

const statusResumoValues = ['Conforme', 'Divergente', 'Em análise'] as const;
type StatusResumoValue = (typeof statusResumoValues)[number];

const analiseStatusValues = ['verde', 'amarelo', 'vermelho'] as const;
type AnaliseStatusValue = (typeof analiseStatusValues)[number];

const invoiceStatusValues = ['Paga', 'Em aberto', 'Em análise', 'Vencida'] as const;
type InvoiceStatusValue = (typeof invoiceStatusValues)[number];

const normalizeString = (value: unknown, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
};

const splitEmailList = (value: string): string[] =>
  value
    .split(/[,;|\n]/)
    .map((item) => item.trim())
    .filter((item) => item && /@/.test(item));

const joinEmailList = (emails: string[]): string => emails.join('; ');

const hasEmailAddress = (value: string): boolean => /@/.test(value);

const normalizeEmailFieldValue = (value: unknown): string => {
  const text = normalizeString(value);
  if (!text) return '';
  const emails = splitEmailList(text);
  if (!emails.length) return text;
  return joinEmailList(emails);
};

const normalizeIsoDate = (value: unknown): string => {
  const text = normalizeString(value);
  if (!text) return '';
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return isoMatch ? text : '';
};

const normalizeReferenceMonth = (value: unknown): string => {
  const isoDate = normalizeIsoDate(value);
  if (isoDate) {
    return isoDate.slice(0, 7);
  }
  const text = normalizeString(value);
  const monthMatch = text.match(/^(\d{4})[-/](\d{2})/);
  return monthMatch ? `${monthMatch[1]}-${monthMatch[2]}` : '';
};

const formatCurrencyBRL = (value: number): string => {
  if (!Number.isFinite(value)) return 'R$ 0,00';
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    console.warn('[ContractsContext] Falha ao formatar moeda, usando fallback.', error);
    return `R$ ${value.toFixed(2)}`;
  }
};

const formatProinfa = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Não informado';
  }
  try {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  } catch (error) {
    console.warn('[ContractsContext] Falha ao formatar Proinfa, usando fallback.', error);
    return value.toFixed(3);
  }
};

const removeDiacritics = (value: string) =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const toOptionalEmail = (value: string): string | undefined => {
  const normalized = normalizeString(value);
  if (!normalized) return undefined;
  const canonical = removeDiacritics(normalized);
  if (canonical === 'nao informado' || canonical === 'nao-informado') {
    return undefined;
  }
  return normalized;
};

const parsePercentInput = (value: unknown): number | null => {
  const text = normalizeString(value);
  if (!text) return null;
  const match = text.replace(/%/g, '').replace(/\s/g, '').replace(',', '.');
  if (!match) return null;
  const numeric = Number(match);
  if (!Number.isFinite(numeric)) return null;
  const normalized = Math.abs(numeric) > 1 ? numeric / 100 : numeric;
  return Number.isFinite(normalized) ? normalized : null;
};

const parseNumericInput = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = normalizeString(value).replace(/[^0-9,-.]/g, '').replace(',', '.');
  if (!text) return null;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : null;
};

const toIsoDateTime = (value: unknown): string | undefined => {
  const normalized = normalizeIsoDate(value);
  if (!normalized) return undefined;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

const normalizeResumoStatus = (value: unknown): StatusResumoValue => {
  const text = normalizeString(value).toLowerCase();
  if (!text) return 'Em análise';
  const sanitized = removeDiacritics(text);
  if (['conforme', 'compliant', 'ok'].includes(sanitized)) return 'Conforme';
  if (['divergente', 'inconforme', 'noncompliant', 'non-compliant', 'noncompliance'].includes(sanitized)) return 'Divergente';
  if (sanitized.includes('analise') || sanitized.includes('analysis') || sanitized.includes('review') || sanitized.includes('pending')) {
    return 'Em análise';
  }
  return 'Em análise';
};

const normalizeAnaliseStatus = (value: unknown): AnaliseStatusValue => {
  const text = removeDiacritics(normalizeString(value));
  if (analiseStatusValues.includes(text as AnaliseStatusValue)) {
    return text as AnaliseStatusValue;
  }
  if (text === 'amarela') return 'amarelo';
  if (text === 'vermelha') return 'vermelho';
  return 'amarelo';
};

const normalizeInvoiceStatus = (value: unknown): InvoiceStatusValue => {
  const text = removeDiacritics(normalizeString(value));
  if (text === 'paga' || text === 'pagas') return 'Paga';
  if (text === 'em aberto' || text === 'aberto') return 'Em aberto';
  if (text === 'vencida' || text === 'vencido' || text === 'overdue') return 'Vencida';
  if (text.includes('analise')) return 'Em análise';
  return 'Em análise';
};

const normalizeContratoStatus = (value: unknown): ContractMock['status'] => {
  const text = removeDiacritics(normalizeString(value));
  if (['ativo', 'ativos', 'active'].includes(text)) return 'Ativo';
  if (['inativo', 'inativos', 'inactive'].includes(text)) return 'Inativo';
  if (text.includes('analise') || text.includes('analysis')) return 'Em análise';
  if (['pendente', 'pending'].includes(text)) return 'Em análise';
  return 'Ativo';
};

const normalizeFonte = (value: unknown): ContractMock['fonte'] => {
  const raw = normalizeString(value);
  const text = removeDiacritics(raw);
  if (text.includes('incentivada 0')) return 'Incentivada 0%';
  if (text.includes('incentivada 50')) return 'Incentivada 50%';
  if (text.includes('incentivada 100')) return 'Incentivada 100%';
  if (text === 'incentivada' || text === 'subsidized') return 'Incentivada 100%';
  if (text.includes('convencional') || text === 'conventional') return 'Incentivada 0%';
  if (raw) {
    const numberMatch = raw.match(/(0|25|40|50|60|75|80|90|100)/);
    if (numberMatch) {
      const numeric = Number(numberMatch[0]);
      if (numeric >= 75) return 'Incentivada 100%';
      if (numeric >= 40) return 'Incentivada 50%';
    }
  }
  return 'Incentivada 0%';
};

const normalizeResumo = (value: unknown): ContractMock['resumoConformidades'] => {
  const resumo: ContractMock['resumoConformidades'] = {
    Consumo: 'Em análise',
    NF: 'Em análise',
    Fatura: 'Em análise',
    Encargos: 'Em análise',
    Conformidade: 'Em análise',
  };

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    Object.entries(value as Record<string, unknown>).forEach(([key, status]) => {
      if (resumoKeys.includes(key as keyof ContractMock['resumoConformidades'])) {
        resumo[key as keyof ContractMock['resumoConformidades']] = normalizeResumoStatus(status);
        return;
      }

      const sanitized = removeDiacritics(key);
      if (sanitized === 'compliance_consumption' || sanitized === 'consumo') {
        resumo.Consumo = normalizeResumoStatus(status);
      } else if (sanitized === 'compliance_nf' || sanitized === 'nf' || sanitized === 'nota_fiscal') {
        resumo.NF = normalizeResumoStatus(status);
      } else if (sanitized === 'compliance_invoice' || sanitized === 'fatura' || sanitized === 'invoice') {
        resumo.Fatura = normalizeResumoStatus(status);
      } else if (sanitized === 'compliance_charges' || sanitized === 'encargos' || sanitized === 'charges') {
        resumo.Encargos = normalizeResumoStatus(status);
      } else if (sanitized === 'compliance_overall' || sanitized === 'conformidade' || sanitized === 'overall') {
        resumo.Conformidade = normalizeResumoStatus(status);
      }
    });
  }

  return resumo;
};

const formatPercentValue = (value: unknown): string => {
  const text = normalizeString(value);
  if (!text) return '';

  const sanitized = text.replace(/\s+/g, '');
  const hasPercentSymbol = sanitized.includes('%');
  const numeric = Number(sanitized.replace(/%/g, '').replace(',', '.'));

  if (!Number.isFinite(numeric)) {
    return text;
  }

  if (hasPercentSymbol) {
    const ratioFromPercent = numeric / 100;
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        maximumFractionDigits: 2,
      }).format(ratioFromPercent);
    } catch {
      return `${numeric.toFixed(2)}%`;
    }
  }

  const absNumeric = Math.abs(numeric);
  const ratio = absNumeric <= 2 ? numeric : numeric / 100;

  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      maximumFractionDigits: 2,
    }).format(ratio);
  } catch {
    return `${(ratio * 100).toFixed(2)}%`;
  }
};

const formatMwhValue = (value: unknown): string => {
  const numeric = Number(typeof value === 'string' ? value.replace(',', '.') : value);
  if (Number.isFinite(numeric)) {
    return `${numeric.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MWh`;
  }
  const text = normalizeString(value);
  if (!text) return '';
  return /mwh/i.test(text) ? text : `${text} MWh`;
};

const normalizeFieldLabel = (label: string): string => {
  const text = normalizeString(label);
  if (!text) return '';
  const sanitized = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ');
  return sanitized
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const normalizeContractData = (value: unknown): ContractMock['dadosContrato'] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        label: normalizeString((item as { label?: unknown }).label),
        value: normalizeString((item as { value?: unknown }).value),
      }))
      .filter((item) => item.label || item.value);
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([label, val]) => ({ label: normalizeFieldLabel(label) || normalizeString(label), value: normalizeString(val) }))
      .filter((item) => item.label || item.value);
  }
  return [];
};

const normalizeKpis = (value: unknown): ContractMock['kpis'] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const label = normalizeString((item as { label?: unknown; nome?: unknown }).label ?? (item as { nome?: unknown }).nome);
      const rawValue =
        (item as { value?: unknown; valor?: unknown }).value ?? (item as { valor?: unknown }).valor;
      const valueText = normalizeString(rawValue);
      if (!label || !valueText) return null;
      const helper = normalizeString(
        (item as { helper?: unknown; descricao?: unknown }).helper ??
          (item as { descricao?: unknown }).descricao
      );
      const variationValue = normalizeString((item as { variation?: { value?: unknown } }).variation?.value ?? (item as { variacao?: unknown }).variacao);
      const directionRaw = normalizeString((item as { variation?: { direction?: unknown } }).variation?.direction);
      const directionText = removeDiacritics(directionRaw);
      const direction: 'up' | 'down' | 'neutral' | undefined =
        directionText === 'up' || directionText === 'positivo'
          ? 'up'
          : directionText === 'down' || directionText === 'negativo'
          ? 'down'
          : directionText
          ? 'neutral'
          : undefined;

      const result: ContractMock['kpis'][number] = { label, value: valueText };
      if (helper) result.helper = helper;
      if (variationValue && direction) {
        result.variation = { value: variationValue, direction };
      }
      return result;
    })
    .filter((item): item is ContractMock['kpis'][number] => item !== null);
};

const normalizeHistoricoDemanda = (value: unknown): ContractMock['historicoDemanda'] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      mes: normalizeString((item as { mes?: unknown; competencia?: unknown }).mes ?? (item as { competencia?: unknown }).competencia),
      ponta: Number((item as { ponta?: unknown; pontaMWh?: unknown }).ponta ?? (item as { pontaMWh?: unknown }).pontaMWh) || 0,
      foraPonta:
        Number((item as { foraPonta?: unknown; fora_ponta?: unknown }).foraPonta ?? (item as { fora_ponta?: unknown }).fora_ponta) || 0,
    }))
    .filter((item) => item.mes);
};

const normalizeHistoricoConsumo = (value: unknown): ContractMock['historicoConsumo'] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      mes: normalizeString((item as { mes?: unknown; competencia?: unknown }).mes ?? (item as { competencia?: unknown }).competencia),
      meta: Number((item as { meta?: unknown }).meta) || 0,
      realizado: Number((item as { realizado?: unknown }).realizado) || 0,
    }))
    .filter((item) => item.mes);
};

const normalizeObrigacoes = (value: unknown): ContractMock['obrigacoes'] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const periodo = normalizeString((item as { periodo?: unknown }).periodo);
      if (!periodo) return null;
      const statusObj: Record<string, ContractMock['resumoConformidades'][keyof ContractMock['resumoConformidades']]> = {};
      const statusRaw = (item as { status?: unknown; etapas?: unknown }).status ?? (item as { etapas?: unknown }).etapas;
      if (statusRaw && typeof statusRaw === 'object') {
        Object.entries(statusRaw as Record<string, unknown>).forEach(([key, status]) => {
          statusObj[key] = normalizeResumoStatus(status);
        });
      }
      return {
        periodo,
        status: statusObj,
      };
    })
    .filter((item): item is ContractMock['obrigacoes'][number] => Boolean(item));
};

const etapaNomeValues = ['Dados', 'Cálculo', 'Análise'] as const;
type EtapaNomeValue = (typeof etapaNomeValues)[number];

const normalizeEtapaNome = (value: unknown): EtapaNomeValue => {
  const text = normalizeString(value);
  if (!text) return 'Dados';
  const sanitized = removeDiacritics(text);
  const match = etapaNomeValues.find((option) => removeDiacritics(option) === sanitized);
  if (match) return match;
  if (sanitized.includes('calc')) return 'Cálculo';
  if (sanitized.includes('anal')) return 'Análise';
  return 'Dados';
};

const normalizeAnalises = (value: unknown): ContractMock['analises'] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const area = normalizeString((item as { area?: unknown; nome?: unknown }).area ?? (item as { nome?: unknown }).nome);
      if (!area) return null;
      const etapasRaw = (item as { etapas?: unknown; steps?: unknown }).etapas ?? (item as { steps?: unknown }).steps;
      const etapas = Array.isArray(etapasRaw)
        ? etapasRaw
            .map((etapa) => {
              const nome = normalizeEtapaNome(
                (etapa as { nome?: unknown; etapa?: unknown }).nome ??
                  (etapa as { etapa?: unknown }).etapa
              );
              const status = normalizeAnaliseStatus((etapa as { status?: unknown }).status);
              if (!analiseStatusValues.includes(status)) return null;
              const observacao = normalizeString(
                (etapa as { observacao?: unknown; descricao?: unknown }).observacao ??
                  (etapa as { descricao?: unknown }).descricao
              );
              const etapaResult: ContractMock['analises'][number]['etapas'][number] = {
                nome,
                status,
              };
              if (observacao) {
                etapaResult.observacao = observacao;
              }
              return etapaResult;
            })
            .filter((etapa): etapa is ContractMock['analises'][number]['etapas'][number] => etapa !== null)
        : [];
      const result: ContractMock['analises'][number] = {
        area,
        etapas,
      };
      return result;
    })
    .filter((item): item is ContractMock['analises'][number] => item !== null);
};

const normalizeFaturas = (value: unknown): ContractMock['faturas'] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const rawId =
        (item as { id?: unknown }).id ??
        (item as { identificador?: unknown }).identificador ??
        `invoice-${index + 1}`;
      const rawArquivo = (item as { arquivo?: unknown }).arquivo ?? (item as { url?: unknown }).url;
      return {
        id: normalizeString(rawId),
        competencia: normalizeString((item as { competencia?: unknown }).competencia),
        vencimento: normalizeString((item as { vencimento?: unknown; dueDate?: unknown }).vencimento ?? (item as { dueDate?: unknown }).dueDate),
        valor: Number((item as { valor?: unknown }).valor) || 0,
        status: normalizeInvoiceStatus((item as { status?: unknown }).status),
        arquivo: rawArquivo ? normalizeString(rawArquivo) : undefined,
      };
    })
    .filter((item) => item.competencia);
};

const normalizePeriodos = (value: unknown): ContractMock['periodos'] => {
  if (!Array.isArray(value)) return [];
  return value.map((periodo) => normalizeString(periodo)).filter(Boolean);
};

const normalizeContractsFromApi = (payload: unknown): ContractMock[] => {
  console.log('🔍 [normalizeContractsFromApi] Payload recebido:', {
    payloadType: typeof payload,
    isArray: Array.isArray(payload),
    payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload) : null,
  });
  
  const extractArray = (data: unknown): unknown[] => {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    const maybeArrayKeys = ['contratos', 'contracts', 'items', 'data', 'result'];
    for (const key of maybeArrayKeys) {
      const value = (data as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).items)) {
        return (value as Record<string, unknown>).items as unknown[];
      }
      if (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).contratos)) {
        return (value as Record<string, unknown>).contratos as unknown[];
      }
    }
    return [];
  };

  const rawContracts = extractArray(payload);
  
  return rawContracts.map((item, index) => {
    const baseId = normalizeString((item as { id?: unknown; codigo?: unknown }).id ?? (item as { codigo?: unknown }).codigo);
    const id = baseId || `contract-${index + 1}`;

    const referenceBaseRaw =
      (item as { reference_base?: unknown }).reference_base ??
      (item as { referenciaBase?: unknown }).referenciaBase ??
      (item as { baseReferencia?: unknown }).baseReferencia ??
      (item as { billing_cycle?: unknown }).billing_cycle;

    const referenceMonth = normalizeReferenceMonth(referenceBaseRaw);
    const ciclo =
      normalizeString(
        (item as { cicloFaturamento?: unknown; ciclo?: unknown; periodo?: unknown }).cicloFaturamento ??
          (item as { ciclo?: unknown }).ciclo ??
          (item as { periodo?: unknown }).periodo ??
          (item as { billing_cycle?: unknown }).billing_cycle ??
          referenceMonth
      ) || referenceMonth;

    const rawCodigo =
      (item as { codigo?: unknown }).codigo ??
      (item as { codigoContrato?: unknown }).codigoContrato ??
      (item as { contract?: unknown }).contract ??
      (item as { contract_code?: unknown }).contract_code ??
      id;
    const rawCliente =
      (item as { cliente?: unknown }).cliente ??
      (item as { client?: unknown }).client ??
      (item as { nomeCliente?: unknown }).nomeCliente ??
      (item as { client_name?: unknown }).client_name ??
      'Cliente não informado';
    const rawSegmento =
      (item as { segmento?: unknown }).segmento ?? 
      (item as { segment?: unknown }).segment ?? 
      'Não informado';
    const rawContato =
      (item as { contato?: unknown }).contato ??
      (item as { responsavel?: unknown }).responsavel ??
      (item as { contact?: unknown }).contact ??
      (item as { contact_responsible?: unknown }).contact_responsible ??
      '';

    const contatoAtivoRaw =
      (item as { contact_active?: unknown }).contact_active ??
      (item as { contatoAtivo?: unknown }).contatoAtivo ??
      (item as { ativoContato?: unknown }).ativoContato;

    const contatoAtivo =
      typeof contatoAtivoRaw === 'boolean'
        ? contatoAtivoRaw
        : typeof contatoAtivoRaw === 'string'
        ? contatoAtivoRaw.toLowerCase() === 'true'
        : undefined;

    const supplier =
      normalizeString(
        (item as { supplier?: unknown }).supplier ??
          (item as { fornecedor?: unknown }).fornecedor ??
          (item as { supplier_name?: unknown }).supplier_name
      );
    const proinfa = parseNumericInput(
      (item as { proinfa_contribution?: unknown }).proinfa_contribution ??
        (item as { proinfa?: unknown }).proinfa ??
        (item as { contribuicaoProinfa?: unknown }).contribuicaoProinfa ??
        (item as { contribuicao_proinfa?: unknown }).contribuicao_proinfa
    );
    const meter = normalizeString(
      (item as { meter?: unknown }).meter ?? 
      (item as { medidor?: unknown }).medidor ??
      (item as { groupName?: unknown }).groupName
    );
    const clientId = normalizeString(
      (item as { client_id?: unknown }).client_id ??
        (item as { clienteId?: unknown }).clienteId ??
        (item as { clientId?: unknown }).clientId
    );
    let balanceEmailValue = normalizeEmailFieldValue(
      (item as { balance_email?: unknown }).balance_email ??
        (item as { balanceEmail?: unknown }).balanceEmail
    );
    let billingEmailValue = normalizeEmailFieldValue(
      (item as { billing_email?: unknown }).billing_email ??
        (item as { billingEmail?: unknown }).billingEmail
    );
    const combinedEmailRaw = normalizeString((item as { email?: unknown }).email);
    const fonteValue = normalizeFonte(
      (item as { fonte?: unknown }).fonte ?? (item as { energy_source?: unknown }).energy_source
    );
    const submarketValue =
      normalizeString(
        (item as { submercado?: unknown }).submercado ??
          (item as { submarket?: unknown }).submarket ??
          (item as { sub_market?: unknown }).sub_market
      ) || '';
    
    // Add status field mapping
    const statusRaw = 
      (item as { status?: unknown }).status ??
      (item as { contract_status?: unknown }).contract_status;
    const status = normalizeString(statusRaw) || 'Não informado';

    const rawPrice =
      (item as { price?: unknown }).price ??
      (item as { preco?: unknown }).preco ??
      (item as { precoMedio?: unknown }).precoMedio ??
      (item as { average_price_mwh?: unknown }).average_price_mwh;
    const precoMedio = Number(rawPrice) || 0;

    const inicioVigencia = normalizeIsoDate(
      (item as { inicioVigencia?: unknown; vigenciaInicio?: unknown }).inicioVigencia ??
        (item as { vigenciaInicio?: unknown }).vigenciaInicio ??
        (item as { start_date?: unknown }).start_date ??
        referenceBaseRaw
    );
    const fimVigencia = normalizeIsoDate(
      (item as { fimVigencia?: unknown; vigenciaFim?: unknown }).fimVigencia ??
        (item as { vigenciaFim?: unknown }).vigenciaFim ??
        (item as { end_date?: unknown }).end_date
    );

    const createdAtRaw =
      (item as { created_at?: unknown }).created_at ??
      (item as { createdAt?: unknown }).createdAt ??
      (item as { created?: unknown }).created;
    const updatedAtRaw =
      (item as { updated_at?: unknown }).updated_at ??
      (item as { updatedAt?: unknown }).updatedAt ??
      (item as { updated?: unknown }).updated;
    const createdAt = normalizeIsoDate(createdAtRaw);
    const updatedAt = normalizeIsoDate(updatedAtRaw);

    const periodosBase = normalizePeriodos(
      (item as { periodos?: unknown }).periodos ??
        (item as { meses?: unknown }).meses ??
        (item as { ciclos?: unknown }).ciclos
    );
    const periodos = referenceMonth
      ? Array.from(new Set([...periodosBase, referenceMonth]))
      : periodosBase;

    const resumo = normalizeResumo(
      (item as { resumoConformidades?: unknown; conformidades?: unknown }).resumoConformidades ??
        (item as { conformidades?: unknown }).conformidades ??
        {
          Consumo: (item as { compliance_consumption?: unknown }).compliance_consumption,
          NF: (item as { compliance_nf?: unknown }).compliance_nf,
          Fatura: (item as { compliance_invoice?: unknown }).compliance_invoice,
          Encargos: (item as { compliance_charges?: unknown }).compliance_charges,
          Conformidade: (item as { compliance_overall?: unknown }).compliance_overall,
        }
    );

    const adjustedRaw =
      (item as { adjusted?: unknown }).adjusted ?? (item as { ajustado?: unknown }).ajustado;
    const adjusted =
      typeof adjustedRaw === 'boolean'
        ? adjustedRaw
        : typeof adjustedRaw === 'string'
        ? adjustedRaw.toLowerCase() === 'true'
        : undefined;

    if (adjusted !== undefined) {
      const resumoStatus: ContractMock['resumoConformidades']['Consumo'] = adjusted ? 'Conforme' : 'Em análise';
      resumo.Consumo = resumoStatus;
      resumo.Fatura = resumoStatus;
      resumo.Conformidade = resumoStatus;
    }

    const dadosContratoBase: ContractMock['dadosContrato'] = [
      ...normalizeContractData(
        (item as { dadosContrato?: unknown; dados?: unknown }).dadosContrato ??
          (item as { dados?: unknown }).dados
      ),
    ];

    const dadosContratoKeys = new Set(dadosContratoBase.map((field) => removeDiacritics(field.label)));
    const ensureField = (label: string, value: string): number => {
      const normalizedLabel = removeDiacritics(label);
      const normalizedValue = normalizeString(value);
      const finalValue = normalizedValue || 'Não informado';
      const existingIndex = dadosContratoBase.findIndex(
        (field) => removeDiacritics(field.label) === normalizedLabel
      );
      dadosContratoKeys.add(normalizedLabel);
      if (existingIndex >= 0) {
        dadosContratoBase[existingIndex] = { label, value: finalValue };
        return existingIndex;
      }
      dadosContratoBase.push({ label, value: finalValue });
      return dadosContratoBase.length - 1;
    };

    const contractedVolume =
      (item as { energiaContratada?: unknown }).energiaContratada ??
      (item as { contracted_volume_mwh?: unknown }).contracted_volume_mwh;
    const flexValue =
      (item as { flex?: unknown; flexibilidade?: unknown }).flex ??
      (item as { flexibilidade?: unknown }).flexibilidade ??
      (item as { flexibility_percent?: unknown }).flexibility_percent;
    const upperLimitRaw =
      (item as { limiteSuperior?: unknown }).limiteSuperior ??
      (item as { upper_limit_percent?: unknown }).upper_limit_percent;
    const lowerLimitRaw =
      (item as { limiteInferior?: unknown }).limiteInferior ??
      (item as { lower_limit_percent?: unknown }).lower_limit_percent;
    // 🔍 DEBUG: Log do item completo para ver o que vem do backend
    console.log('🔍 [ContractsContext] Item completo do backend:', {
      id: (item as { id?: unknown }).id,
      contract_code: (item as { contract_code?: unknown }).contract_code,
      seasonal_flexibility_upper_percentage: (item as { seasonal_flexibility_upper_percentage?: unknown }).seasonal_flexibility_upper_percentage,
      seasonal_flexibility_min_percentage: (item as { seasonal_flexibility_min_percentage?: unknown }).seasonal_flexibility_min_percentage,
      seasonal_flexibility_upper: (item as { seasonal_flexibility_upper?: unknown }).seasonal_flexibility_upper,
      seasonal_flexibility_lower: (item as { seasonal_flexibility_lower?: unknown }).seasonal_flexibility_lower,
      flexSazonalSuperior: (item as { flexSazonalSuperior?: unknown }).flexSazonalSuperior,
      flexSazonalInferior: (item as { flexSazonalInferior?: unknown }).flexSazonalInferior,
    });

    // PRIORIDADE: Busca PRIMEIRO dos campos corretos do backend (snake_case da tabela)
    // seasonal_flexibility_upper_percentage e seasonal_flexibility_min_percentage
    const seasonalFlexUpperRaw =
      (item as { seasonal_flexibility_upper_percentage?: unknown }).seasonal_flexibility_upper_percentage ??
      (item as { seasonal_flexibility_upper?: unknown }).seasonal_flexibility_upper ??
      (item as { seasonalFlexibilityUpperPercentage?: unknown }).seasonalFlexibilityUpperPercentage ??
      (item as { flexSazonalSuperior?: unknown }).flexSazonalSuperior ??
      (item as { flex_sazonal_superior?: unknown }).flex_sazonal_superior;
    const seasonalFlexLowerRaw =
      (item as { seasonal_flexibility_min_percentage?: unknown }).seasonal_flexibility_min_percentage ??
      (item as { seasonal_flexibility_lower?: unknown }).seasonal_flexibility_lower ??
      (item as { seasonalFlexibilityMinPercentage?: unknown }).seasonalFlexibilityMinPercentage ??
      (item as { flexSazonalInferior?: unknown }).flexSazonalInferior ??
      (item as { flex_sazonal_inferior?: unknown }).flex_sazonal_inferior;

    console.log('🔍 [ContractsContext] Valores extraídos (raw):', {
      seasonalFlexUpperRaw,
      seasonalFlexLowerRaw,
      tipoUpper: typeof seasonalFlexUpperRaw,
      tipoLower: typeof seasonalFlexLowerRaw,
    });

    const findEmailValueInDados = (keywords: string[]): string | undefined => {
      const normalizedKeywords = keywords.map((keyword) => removeDiacritics(keyword));
      const match = dadosContratoBase.find((field) => {
        const normalizedLabel = removeDiacritics(field.label);
        return normalizedKeywords.every((keyword) => normalizedLabel.includes(keyword));
      });
      if (!match) return undefined;
      const normalizedValue = normalizeEmailFieldValue(match.value);
      return hasEmailAddress(normalizedValue) ? normalizedValue : undefined;
    };

    const balanceEmailFromDados = findEmailValueInDados(['email', 'balanco']);
    if (!hasEmailAddress(balanceEmailValue) && balanceEmailFromDados) {
      balanceEmailValue = balanceEmailFromDados;
    }
    const billingEmailFromDados = findEmailValueInDados(['email', 'faturamento']);
    if (!hasEmailAddress(billingEmailValue) && billingEmailFromDados) {
      billingEmailValue = billingEmailFromDados;
    }

    if (combinedEmailRaw) {
      const combinedSegments = combinedEmailRaw
        .split(';')
        .map((segment) => segment.trim())
        .filter(Boolean);

      if (!hasEmailAddress(balanceEmailValue) && combinedSegments.length > 0) {
        const normalizedBalance = normalizeEmailFieldValue(combinedSegments[0]);
        if (hasEmailAddress(normalizedBalance)) {
          balanceEmailValue = normalizedBalance;
        }
      }

      if (!hasEmailAddress(billingEmailValue) && combinedSegments.length > 1) {
        const normalizedBilling = normalizeEmailFieldValue(combinedSegments.slice(1).join('; '));
        if (hasEmailAddress(normalizedBilling)) {
          billingEmailValue = normalizedBilling;
        }
      }
    }

    const supplierDisplay = supplier || 'Não informado';
    ensureField('Fornecedor', supplierDisplay);
    ensureField('Submercado', submarketValue || 'Não informado');
    ensureField('Medidor', meter || 'Não informado');
    ensureField('Preço (R$/MWh)', precoMedio ? formatCurrencyBRL(precoMedio) : 'Não informado');
    ensureField('Contrato', normalizeString(rawCodigo));
    ensureField('Cliente ID', clientId || 'Não informado');
    ensureField('Volume contratado', formatMwhValue(contractedVolume));
    const flexDisplay = [formatPercentValue(flexValue), formatPercentValue(lowerLimitRaw), formatPercentValue(upperLimitRaw)]
      .filter(Boolean)
      .join(' · ');
    ensureField('Flex / Limites', flexDisplay);
    const seasonalFlexUpperFormatted = formatPercentValue(seasonalFlexUpperRaw);
    const seasonalFlexLowerFormatted = formatPercentValue(seasonalFlexLowerRaw);
    
    console.log('🔍 [ContractsContext] Valores formatados:', {
      seasonalFlexUpperRaw,
      seasonalFlexLowerRaw,
      seasonalFlexUpperFormatted,
      seasonalFlexLowerFormatted,
    });
    
    const seasonalFlexDisplay = [seasonalFlexLowerFormatted, seasonalFlexUpperFormatted]
      .filter(Boolean)
      .join(' - ');
    if (seasonalFlexDisplay) {
      ensureField('Flex sazonalidade', seasonalFlexDisplay);
    }
    ensureField('Status', status);
    ensureField('Segmento', normalizeString(rawSegmento));
    ensureField('Responsável', normalizeString(rawContato) || 'Não informado');
    ensureField('Fonte de energia', fonteValue || 'Não informado');
    ensureField('Modalidade', normalizeString((item as { contracted_modality?: unknown }).contracted_modality) || 'Não informado');

    const balanceEmailDisplay = hasEmailAddress(balanceEmailValue) ? balanceEmailValue : 'Não informado';
    const billingEmailDisplay = hasEmailAddress(billingEmailValue) ? billingEmailValue : 'Não informado';
    const balanceEmailFieldIndex = ensureField('Email de balanço energético', balanceEmailDisplay);
    const billingEmailFieldIndex = ensureField('Email de faturamento', billingEmailDisplay);

    if (balanceEmailFieldIndex > billingEmailFieldIndex) {
      const [balanceField] = dadosContratoBase.splice(balanceEmailFieldIndex, 1);
      dadosContratoBase.splice(billingEmailFieldIndex, 0, balanceField);
    }

    if (adjusted !== undefined) {
      ensureField('Ajustado', adjusted ? 'Sim' : 'Não');
    }
    if (referenceBaseRaw) {
      ensureField('Base de referência', normalizeIsoDate(referenceBaseRaw) || normalizeString(referenceBaseRaw));
    }
    ensureField('Início da vigência', inicioVigencia);
    ensureField('Fim da vigência', fimVigencia);
    ensureField('Criado em', createdAt);
    ensureField('Atualizado em', updatedAt);

    const kpisBase: ContractMock['kpis'] = [
      ...normalizeKpis((item as { kpis?: unknown; indicadores?: unknown }).kpis ?? (item as { indicadores?: unknown }).indicadores),
    ];
    if (precoMedio) {
      kpisBase.push({ label: 'Preço contratado', value: formatCurrencyBRL(precoMedio) });
    }
    if (contractedVolume) {
      kpisBase.push({ label: 'Volume contratado', value: formatMwhValue(contractedVolume) });
    }
    if (typeof contatoAtivo === 'boolean') {
      kpisBase.push({ label: 'Contato', value: contatoAtivo ? 'Ativo' : 'Inativo' });
    }

    const contatoFinal =
      normalizeString(rawContato) ||
      (typeof contatoAtivo === 'boolean' ? (contatoAtivo ? 'Contato ativo' : 'Contato inativo') : 'Não informado');

    const statusValor = (status === 'Ativo' || status === 'Inativo' || status === 'Em análise') 
      ? status 
      : normalizeContratoStatus((item as { status?: unknown }).status);

    const coercePricePeriodsString = (value: unknown): string | null => {
      if (!value) return null;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
      }
      if (typeof value === 'object') {
        try {
          const serialized = JSON.stringify(value);
          return serialized.trim() ? serialized : null;
        } catch (error) {
          console.warn('[ContractsContext] Falha ao serializar price_periods', error, value);
          return null;
        }
      }
      return null;
    };

    const parseFiniteNumber = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const numeric = Number(value.replace(',', '.'));
        return Number.isFinite(numeric) ? numeric : null;
      }
      return null;
    };

    const periodPriceNormalized = (() => {
      const periodPriceRaw = (item as { periodPrice?: unknown }).periodPrice;
      const pricePeriodsFromObject = periodPriceRaw && typeof periodPriceRaw === 'object'
        ? (periodPriceRaw as { price_periods?: unknown }).price_periods
        : undefined;
      const flatPriceFromObject = periodPriceRaw && typeof periodPriceRaw === 'object'
        ? (periodPriceRaw as { flat_price_mwh?: unknown }).flat_price_mwh
        : undefined;
      const flatYearsFromObject = periodPriceRaw && typeof periodPriceRaw === 'object'
        ? (periodPriceRaw as { flat_years?: unknown }).flat_years
        : undefined;

      const pricePeriodsDirect = (item as { price_periods?: unknown }).price_periods;
      const flatPriceDirect = (item as { flat_price_mwh?: unknown }).flat_price_mwh;
      const flatYearsDirect = (item as { flat_years?: unknown }).flat_years;

      const pricePeriodsValue = coercePricePeriodsString(pricePeriodsFromObject ?? pricePeriodsDirect);
      const flatPriceValue = parseFiniteNumber(flatPriceFromObject ?? flatPriceDirect);
      const flatYearsValue = parseFiniteNumber(flatYearsFromObject ?? flatYearsDirect);

      return {
        price_periods: pricePeriodsValue,
        flat_price_mwh: flatPriceValue,
        flat_years: flatYearsValue,
      };
    })();

    const flatPriceValue = periodPriceNormalized.flat_price_mwh;
    ensureField(
      'Preço Flat',
      typeof flatPriceValue === 'number' && Number.isFinite(flatPriceValue)
        ? formatCurrencyBRL(flatPriceValue)
        : 'Não informado'
    );

    let parsedPricePeriods: ContractMock['pricePeriods'] | undefined;
    const parsedPricePeriodsValue = parseContractPricePeriods(periodPriceNormalized.price_periods ?? undefined);
    parsedPricePeriods = parsedPricePeriodsValue ?? undefined;

    return {
      id,
      codigo: normalizeString(rawCodigo),
      razaoSocial: normalizeString(
        (item as { legal_name?: unknown }).legal_name ??
          (item as { social_reason?: unknown }).social_reason ??
          (item as { razaoSocial?: unknown }).razaoSocial
      ),
      cliente: normalizeString(rawCliente),
      cnpj: normalizeString((item as { cnpj?: unknown }).cnpj),
      segmento: normalizeString(rawSegmento),
      contato: contatoFinal,
      status: statusValor,
      fonte: fonteValue,
      modalidade:
        normalizeString(
          (item as { modalidade?: unknown }).modalidade ?? (item as { contracted_modality?: unknown }).contracted_modality
        ) || 'Não informado',
      submercado: submarketValue || undefined,
      inicioVigencia: inicioVigencia || normalizeString((item as { inicio?: unknown }).inicio),
      fimVigencia: fimVigencia,
      limiteSuperior: formatPercentValue(
        (item as { limiteSuperior?: unknown }).limiteSuperior ?? (item as { upper_limit_percent?: unknown }).upper_limit_percent
      ),
      limiteInferior: formatPercentValue(
        (item as { limiteInferior?: unknown }).limiteInferior ?? (item as { lower_limit_percent?: unknown }).lower_limit_percent
      ),
      flex: formatPercentValue(
        (item as { flex?: unknown; flexibilidade?: unknown }).flex ??
          (item as { flexibilidade?: unknown }).flexibilidade ??
          (item as { flexibility_percent?: unknown }).flexibility_percent
      ),
      flexSazonalSuperior: seasonalFlexUpperFormatted || null,
      flexSazonalInferior: seasonalFlexLowerFormatted || null,
      precoMedio,
      fornecedor: supplier,
      balanceEmail: toOptionalEmail(balanceEmailValue),
      billingEmail: toOptionalEmail(billingEmailValue),
      pricePeriods: parsedPricePeriods,
      periodPrice: periodPriceNormalized,
      flatPrice: periodPriceNormalized.flat_price_mwh ?? undefined,
      flatYears: periodPriceNormalized.flat_years ?? undefined,
      proinfa: proinfa ?? null,
      cicloFaturamento: ciclo,
      periodos,
      resumoConformidades: resumo,
      kpis: kpisBase,
      dadosContrato: dadosContratoBase,
      historicoDemanda: normalizeHistoricoDemanda((item as { historicoDemanda?: unknown; demanda?: unknown }).historicoDemanda ?? (item as { demanda?: unknown }).demanda),
      historicoConsumo: normalizeHistoricoConsumo((item as { historicoConsumo?: unknown; consumo?: unknown }).historicoConsumo ?? (item as { consumo?: unknown }).consumo),
      obrigacoes: normalizeObrigacoes((item as { obrigacoes?: unknown }).obrigacoes),
      analises: normalizeAnalises((item as { analises?: unknown; analisesConformidade?: unknown }).analises ?? (item as { analisesConformidade?: unknown }).analisesConformidade),
      faturas: normalizeFaturas((item as { faturas?: unknown; invoices?: unknown }).faturas ?? (item as { invoices?: unknown }).invoices),
      createdAt: createdAt || undefined,
      updatedAt: updatedAt || undefined,
      // Vencimento da NF
      nfVencimentoTipo: (() => {
        const tipo = (item as { nf_vencimento_tipo?: unknown; nfVencimentoTipo?: unknown }).nf_vencimento_tipo ?? 
                     (item as { nfVencimentoTipo?: unknown }).nfVencimentoTipo;
        if (tipo === 'dias_uteis' || tipo === 'dias_corridos') return tipo;
        return undefined;
      })(),
      nfVencimentoDias: (() => {
        const dias = (item as { nf_vencimento_dias?: unknown; nfVencimentoDias?: unknown }).nf_vencimento_dias ?? 
                     (item as { nfVencimentoDias?: unknown }).nfVencimentoDias;
        if (typeof dias === 'number' && Number.isFinite(dias) && dias > 0) return dias;
        if (typeof dias === 'string') {
          const parsed = Number(dias);
          if (Number.isFinite(parsed) && parsed > 0) return parsed;
        }
        return undefined;
      })(),
    } satisfies ContractMock & { periodPrice: { price_periods: string | null; flat_price_mwh: number | null; flat_years: number | null } };
  });
};

const buildEndpointCandidates = (rawUrl: string): string[] => {
  const normalized = normalizeString(rawUrl) || DEFAULT_API_URL;
  const sanitized = normalized.replace(/\s/g, '');
  if (!sanitized) return [DEFAULT_API_URL];
  const withoutTrailingSlash = sanitized.replace(/\/$/, '');
  const candidates = new Set<string>();
  candidates.add(withoutTrailingSlash);
  if (!/\/contracts(\b|\d|\/)/i.test(withoutTrailingSlash)) {
    candidates.add(`${withoutTrailingSlash}/contracts`);
  }
  return Array.from(candidates);
};

const buildResourceEndpointCandidates = (rawUrl: string, resourceId: string): string[] => {
  const sanitizedId = encodeURIComponent(resourceId);
  return buildEndpointCandidates(rawUrl).map((endpoint) => `${endpoint.replace(/\/$/, '')}/${sanitizedId}`);
};

const isAbsoluteUrl = (value: string): boolean => /^(https?:)?\/\//i.test(value);

const baseHeaders = {
  Accept: 'application/json',
  'ngrok-skip-browser-warning': 'true',
} as const;

const fetchContractsFromEndpoints = async (
  endpoints: string[],
  signal?: AbortSignal
): Promise<ContractMock[]> => {
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: baseHeaders,
        signal,
      });

      if (!response.ok) {
        // Não logar 404 durante fallback de endpoints
        if (response.status === 404) {
          throw new Error(`404`);
        }
        const message = await response.text().catch(() => '');
        throw new Error(
          message || `[ContractsContext] Erro ao buscar contratos em ${endpoint} (status ${response.status}).`
        );
      }

      const data = await response.json().catch(() => null);
      console.log('🔍 [fetchContractsFromEndpoints] Dados brutos do backend:', {
        endpoint,
        dataType: typeof data,
        isArray: Array.isArray(data),
        dataKeys: data && typeof data === 'object' ? Object.keys(data) : null,
        firstItem: Array.isArray(data) ? data[0] : (data && typeof data === 'object' && 'contracts' in data && Array.isArray((data as { contracts: unknown[] }).contracts)) ? (data as { contracts: unknown[] }).contracts[0] : null,
      });
      const contracts = normalizeContractsFromApi(data);
      if (!contracts.length) {
        console.warn('[ContractsContext] API retornou lista vazia de contratos.');
      }
      console.log('🔍 [fetchContractsFromEndpoints] Contratos normalizados:', {
        count: contracts.length,
        firstContract: contracts[0] ? {
          id: contracts[0].id,
          codigo: contracts[0].codigo,
          flexSazonalSuperior: contracts[0].flexSazonalSuperior,
          flexSazonalInferior: contracts[0].flexSazonalInferior,
        } : null,
      });
      return contracts;
    } catch (error) {
      if (signal?.aborted) {
        throw error instanceof Error ? error : new Error(String(error));
      }
      lastError = error;
      // Não logar erros de aborto ou 404 durante fallback de endpoints
      const errorMessage = error instanceof Error ? error.message : String(error);
      const is404Error = errorMessage.includes('404') || (error instanceof Error && errorMessage.includes('status 404'));
      
      if (!is404Error) {
      console.error(
        `[ContractsContext] Erro ao buscar contratos em ${endpoint}.`,
        error instanceof Error ? error : new Error(String(error))
      );
        if (error instanceof TypeError && errorMessage === 'Failed to fetch') {
        console.error(
          '[ContractsContext] Falha de rede ao buscar contratos. Possível problema de CORS ou indisponibilidade da API.'
        );
      }
      console.info('[ContractsContext] Tentando próximo endpoint disponível...');
      }
    }
  }

  throw (lastError instanceof Error ? lastError : new Error('Erro desconhecido ao carregar contratos'));
};

const contractToApiPayload = (contract: ContractMock): Record<string, unknown> => {
  const findDadosValue = (keywords: string[]): string | undefined => {
    const match = contract.dadosContrato.find((item) => {
      const normalized = removeDiacritics(item.label);
      return keywords.some((keyword) => normalized.includes(keyword));
    });
    return match ? normalizeString(match.value) : undefined;
  };

  const sanitizeOptionalField = (value: unknown): string | undefined => {
    const normalized = normalizeString(value);
    if (!normalized) return undefined;
    const canonical = removeDiacritics(normalized).toLowerCase();
    if (canonical === 'nao informado' || canonical === 'nao-informado') {
      return undefined;
    }
    return normalized;
  };

  const supplier = findDadosValue(['fornecedor', 'supplier']);
  // also accept 'medidor' label as groupName
  const groupName = findDadosValue(['grupo', 'group', 'medidor', 'meter']);
  const volumeField =
    contract.dadosContrato.find((item) => /volume/i.test(item.label))?.value ?? contract.flex;
  
  // Melhora a extração do volume: remove texto e formatação, mantém apenas números
  let contractedVolume = null;
  if (volumeField && volumeField !== 'Não informado') {
    // Remove tudo exceto números, pontos e vírgulas
    const volumeStr = String(volumeField).replace(/[^\d.,]/g, '');
    // Remove pontos (separadores de milhar) e substitui vírgula por ponto
    const volumeNum = volumeStr.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(volumeNum);
    if (Number.isFinite(parsed) && parsed > 0) {
      contractedVolume = parsed;
    }
  }
  
  // Se não conseguiu extrair, tenta parseNumericInput como fallback
  if (!contractedVolume) {
    contractedVolume = parseNumericInput(volumeField);
  }
  
  console.log('🔍 [contractToApiPayload] Volume extraído:', {
    volumeField,
    contractedVolume,
    dadosContratoVolume: contract.dadosContrato.find((item) => /volume/i.test(item.label))?.value,
  });
  const supplierFromContract = normalizeString(contract.fornecedor);
  const supplierValue = supplierFromContract || supplier || '';
  const proinfaField = findDadosValue(['proinfa']);
  const proinfaFromDados = parseNumericInput(proinfaField);
  const proinfaValue =
    contract.proinfa !== null && contract.proinfa !== undefined
      ? contract.proinfa
      : proinfaFromDados;

  const sanitizeEmail = (value: unknown): string => {
    const normalized = normalizeString(value);
    if (!normalized) return '';
    const canonical = removeDiacritics(normalized).toLowerCase();
    if (canonical === 'nao informado' || canonical === 'nao-informado') {
      return '';
    }
    return normalized;
  };

  const balanceEmailFromDados = findDadosValue([
    'email de balanco',
    'email_balanco',
    'balanco energetico',
    'balanco',
  ]);
  const billingEmailFromDados = findDadosValue([
    'email de faturamento',
    'email_faturamento',
    'faturamento',
    'billing',
  ]);
  const balanceEmailValue = sanitizeEmail(contract.balanceEmail) || sanitizeEmail(balanceEmailFromDados);
  const billingEmailValue = sanitizeEmail(contract.billingEmail) || sanitizeEmail(billingEmailFromDados);

  const combinedEmailSegments: string[] = [];
  if (balanceEmailValue) {
    combinedEmailSegments.push(balanceEmailValue);
  }
  if (billingEmailValue) {
    combinedEmailSegments.push(billingEmailValue);
  }
  const combinedEmailValue = combinedEmailSegments.length
    ? joinEmailList(combinedEmailSegments.filter((segment) => hasEmailAddress(segment)))
    : undefined;

  // Extrai pricePeriods, flatPrice e flatYears do contrato
  const pricePeriods = (contract as { pricePeriods?: unknown }).pricePeriods;
  const periodPriceFromContract = (contract as {
    periodPrice?: {
      price_periods?: unknown;
      flat_price_mwh?: unknown;
      flat_years?: unknown;
    } | null;
  }).periodPrice;
  const flatPrice = (contract as { flatPrice?: unknown }).flatPrice ?? periodPriceFromContract?.flat_price_mwh;
  const flatYears = (contract as { flatYears?: unknown }).flatYears ?? periodPriceFromContract?.flat_years;

  // Prepara price_periods como JSON string se existir
  // IMPORTANTE: Prioriza periodPrice.price_periods (atualizado pelo modal) sobre pricePeriods (objeto antigo)
  let pricePeriodsJson: string | undefined = undefined;
  
  // PRIORIDADE 1: periodPrice.price_periods (string) - usado pelo VolumeContratadoModal
  if (periodPriceFromContract?.price_periods) {
    const raw = periodPriceFromContract.price_periods;
    if (typeof raw === 'string' && raw.trim() && raw.trim() !== 'null') {
      // Valida se é um JSON válido antes de usar
      try {
        const parsed = JSON.parse(raw);
        // Se tem períodos (mesmo sem preços, pode ter volumes), usa
        if (parsed && typeof parsed === 'object' && (parsed.periods || Array.isArray(parsed))) {
          pricePeriodsJson = raw;
          console.log('[contractToApiPayload] ✅ PRIORIDADE 1: Usando periodPrice.price_periods (string JSON válido):', {
            length: raw.length,
            hasPeriods: !!parsed.periods,
            periodsCount: Array.isArray(parsed.periods) ? parsed.periods.length : 0,
            preview: raw.substring(0, 100),
          });
        } else {
          console.warn('[contractToApiPayload] ⚠️ periodPrice.price_periods não tem estrutura válida (periods)');
        }
      } catch (error) {
        console.warn('[contractToApiPayload] ⚠️ periodPrice.price_periods não é JSON válido:', error);
      }
    } else if (raw && typeof raw === 'object') {
      try {
        pricePeriodsJson = JSON.stringify(raw);
        console.log('[contractToApiPayload] ✅ PRIORIDADE 1: Serializou periodPrice.price_periods (objeto) para JSON');
      } catch (error) {
        console.warn('[ContractsContext] Falha ao serializar periodPrice.price_periods para JSON:', error);
      }
    }
  }
  
  // PRIORIDADE 2: pricePeriods (objeto) - formato antigo, só usa se periodPrice não tiver dados
  if (!pricePeriodsJson && pricePeriods && typeof pricePeriods === 'object') {
    try {
      // Verifica se tem períodos preenchidos
      const periods = (pricePeriods as { periods?: unknown }).periods;
      if (Array.isArray(periods) && periods.length > 0) {
        // Valida se há pelo menos um período com dados
        const hasData = periods.some((period: unknown) => {
          const p = period as { months?: Array<{ price?: number }>; defaultPrice?: number };
          const hasMonthsWithPrice = Array.isArray(p.months) && p.months.some((m: { price?: number }) => 
            typeof m.price === 'number' && Number.isFinite(m.price)
          );
          const hasDefaultPrice = typeof p.defaultPrice === 'number' && Number.isFinite(p.defaultPrice);
          return hasMonthsWithPrice || hasDefaultPrice;
        });

        if (hasData) {
          pricePeriodsJson = JSON.stringify(pricePeriods);
          console.log('[contractToApiPayload] ✅ PRIORIDADE 2: Usando pricePeriods (objeto) serializado');
        }
      }
    } catch (error) {
      console.warn('[ContractsContext] Falha ao serializar pricePeriods para JSON:', error);
    }
  }

  console.log('[contractToApiPayload] 📊 price_periods final:', {
    hasPricePeriodsJson: !!pricePeriodsJson,
    pricePeriodsJsonType: typeof pricePeriodsJson,
    pricePeriodsJsonLength: typeof pricePeriodsJson === 'string' ? pricePeriodsJson.length : 'N/A',
    pricePeriodsJsonPreview: typeof pricePeriodsJson === 'string' ? pricePeriodsJson.substring(0, 200) : 'N/A',
  });

  const normalizeFlatPrice = (value: unknown): number | null => {
    const parsed = parseNumericInput(value);
    if (parsed !== null && Number.isFinite(parsed)) {
      return parsed;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    return null;
  };

  const normalizeFlatYears = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      const rounded = Math.round(value);
      return rounded >= 1 && rounded <= 10 ? rounded : null;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        const rounded = Math.round(parsed);
        return rounded >= 1 && rounded <= 10 ? rounded : null;
      }
    }
    return null;
  };

  const flatPriceValue = normalizeFlatPrice(flatPrice ?? contract.precoMedio);
  const flatYearsValue = normalizeFlatYears(flatYears);

  const hasPricePeriods = Boolean(pricePeriodsJson && pricePeriodsJson.trim() && pricePeriodsJson.trim() !== 'null');

  const payloadPricePeriods = hasPricePeriods ? pricePeriodsJson : null;
  
  console.log('[contractToApiPayload] 🎯 Payload final de price_periods:', {
    hasPricePeriods,
    payloadPricePeriods: payloadPricePeriods ? 'STRING (não-null)' : 'NULL',
    payloadPricePeriodsLength: typeof payloadPricePeriods === 'string' ? payloadPricePeriods.length : 'N/A',
  });
  const payloadFlatPrice = hasPricePeriods ? null : flatPriceValue ?? null;
  const payloadFlatYears = hasPricePeriods ? null : flatYearsValue ?? null;

  const submarketFromContract = sanitizeOptionalField((contract as { submercado?: unknown }).submercado);
  const submarketFromDados = sanitizeOptionalField(findDadosValue(['submercado', 'submarket']));
  const submarketValue = submarketFromContract || submarketFromDados || undefined;

  // Para flexibilidade sazonal, a API espera o valor numérico da porcentagem (ex: 50 para 50%), não decimal (0.5)
  const parsePercentAsNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    const text = String(value).replace(/%/g, '').replace(/\s/g, '').replace(',', '.');
    if (!text) return null;
    const numeric = Number(text);
    return Number.isFinite(numeric) ? numeric : null;
  };
  
  const seasonalFlexUpperFromContract = parsePercentAsNumber((contract as { flexSazonalSuperior?: unknown }).flexSazonalSuperior);
  const seasonalFlexLowerFromContract = parsePercentAsNumber((contract as { flexSazonalInferior?: unknown }).flexSazonalInferior);
  const seasonalFlexUpperField = findDadosValue(['flex', 'sazonal', 'super']);
  const seasonalFlexLowerField = findDadosValue(['flex', 'sazonal', 'infer']);
  const seasonalFlexUpper = seasonalFlexUpperFromContract ?? parsePercentAsNumber(seasonalFlexUpperField);
  const seasonalFlexLower = seasonalFlexLowerFromContract ?? parsePercentAsNumber(seasonalFlexLowerField);
  
  console.log('🔍 [contractToApiPayload] Extraindo flexibilidade sazonal:', {
    contractFlexSazonalSuperior: (contract as { flexSazonalSuperior?: unknown }).flexSazonalSuperior,
    contractFlexSazonalInferior: (contract as { flexSazonalInferior?: unknown }).flexSazonalInferior,
    seasonalFlexUpperFromContract,
    seasonalFlexLowerFromContract,
    seasonalFlexUpperField,
    seasonalFlexLowerField,
    seasonalFlexUpper,
    seasonalFlexLower,
  });

  // Extrai vencimento da NF do contrato
  const nfVencimentoTipo = (contract as { nfVencimentoTipo?: 'dias_uteis' | 'dias_corridos' }).nfVencimentoTipo;
  const nfVencimentoDias = (contract as { nfVencimentoDias?: number }).nfVencimentoDias;
  const nfVencimentoTipoFromDados = findDadosValue(['vencimento', 'nf vencimento', 'vencimento nf']);
  
  // Tenta extrair tipo e dias do campo de dados do contrato se não estiver no contrato diretamente
  let finalNfVencimentoTipo: 'dias_uteis' | 'dias_corridos' | undefined = nfVencimentoTipo;
  let finalNfVencimentoDias: number | undefined = nfVencimentoDias;
  
  if (!finalNfVencimentoTipo && nfVencimentoTipoFromDados) {
    const dadosLower = nfVencimentoTipoFromDados.toLowerCase();
    if (dadosLower.includes('dia útil') || dadosLower.includes('dias úteis') || dadosLower.includes('dia_util')) {
      finalNfVencimentoTipo = 'dias_uteis';
    } else if (dadosLower.includes('dia corrido') || dadosLower.includes('dias corridos') || dadosLower.includes('dia_corrido')) {
      finalNfVencimentoTipo = 'dias_corridos';
    }
  }

  const payload: Record<string, unknown> = {
    contract_code: normalizeString(contract.codigo) || contract.id,
    client_name: normalizeString(contract.cliente),
    legal_name: normalizeString(contract.razaoSocial),
    balance_email: balanceEmailValue,
    billing_email: billingEmailValue,
    ...(combinedEmailValue ? { email: combinedEmailValue } : {}),
    groupName: groupName || 'default',
    supplier: supplierValue ? supplierValue : null,
    cnpj: normalizeString(contract.cnpj),
    segment: normalizeString(contract.segmento),
    contact_responsible: normalizeString(contract.contato),
    submarket: submarketValue,
    contracted_volume_mwh: contractedVolume ?? undefined,
    status: normalizeString(contract.status),
    energy_source: normalizeString(contract.fonte),
    contracted_modality: normalizeString(contract.modalidade),
    start_date: toIsoDateTime(contract.inicioVigencia),
    end_date: toIsoDateTime(contract.fimVigencia),
    billing_cycle: normalizeString(contract.cicloFaturamento),
    upper_limit_percent: parsePercentInput(contract.limiteSuperior),
    lower_limit_percent: parsePercentInput(contract.limiteInferior),
    flexibility_percent: parsePercentInput(contract.flex),
    seasonal_flexibility_upper_percentage: (() => {
      const value = seasonalFlexUpper ?? undefined;
      console.log('🔍 [contractToApiPayload] Enviando seasonal_flexibility_upper_percentage:', value);
      return value;
    })(),
    seasonal_flexibility_min_percentage: (() => {
      const value = seasonalFlexLower ?? undefined;
      console.log('🔍 [contractToApiPayload] Enviando seasonal_flexibility_min_percentage:', value);
      return value;
    })(),
    average_price_mwh: parseNumericInput(contract.precoMedio) ?? contract.precoMedio,
    proinfa_contribution: proinfaValue ?? null,
    compliance_consumption: normalizeString(contract.resumoConformidades.Consumo) || undefined,
    compliance_nf: normalizeString(contract.resumoConformidades.NF) || undefined,
    compliance_invoice: normalizeString(contract.resumoConformidades.Fatura) || undefined,
    compliance_charges: normalizeString(contract.resumoConformidades.Encargos) || undefined,
    compliance_overall: normalizeString(contract.resumoConformidades.Conformidade) || undefined,
    contact_active: Boolean(normalizeString(contract.contato)),
    adjusted: parsePercentInput(contract.flex) ? true : undefined,
    price: parseNumericInput(contract.precoMedio) ?? contract.precoMedio,
    price_periods: payloadPricePeriods,
    flat_price_mwh: payloadFlatPrice,
    flat_years: payloadFlatYears,
    // Adiciona periodPrice como objeto (formato do backend)
    periodPrice: {
      price_periods: payloadPricePeriods,
      flat_price_mwh: payloadFlatPrice,
      flat_years: payloadFlatYears,
    },
    // Vencimento da NF
    ...(finalNfVencimentoTipo ? { nf_vencimento_tipo: finalNfVencimentoTipo } : {}),
    ...(finalNfVencimentoDias !== undefined ? { nf_vencimento_dias: finalNfVencimentoDias } : {}),
  };

  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => {
      // Sempre inclui supplier e proinfa_contribution mesmo se null
      if (key === 'supplier' || key === 'proinfa_contribution') {
        return true;
      }
      // Sempre inclui campos de precificação mesmo se null (o backend precisa saber se foi informado ou não)
      if (['periodPrice', 'price_periods', 'flat_price_mwh', 'flat_years'].includes(key)) {
        return true;
      }
      return value !== undefined && value !== null && value !== '';
    })
  );
};

const contractToServicePayload = (contract: ContractMock): CreateContractPayload => {
  const payload = contractToApiPayload(contract);
  const record = payload as Record<string, unknown>;

  const pickString = (key: string, fallback = '') => normalizeString(record[key] ?? fallback);
  const pickNullableValue = (key: string): string | number | null => {
    const value = record[key];
    if (value === undefined || value === '') {
      return null;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      return value;
    }
    return null;
  };

  // Extrai valores de flexibilidade sazonal do record (já processado por contractToApiPayload)
  // O contractToApiPayload mapeia para seasonal_flexibility_upper_percentage e seasonal_flexibility_min_percentage
  // Mas precisamos enviar como seasonalFlexibilityUpperPercentage e seasonalFlexibilityMinPercentage
  const seasonalFlexUpperFromRecord = pickNullableValue('seasonal_flexibility_upper_percentage');
  const seasonalFlexLowerFromRecord = pickNullableValue('seasonal_flexibility_min_percentage');
  
  // Se não encontrou no record, tenta extrair diretamente do contract
  // Para flexibilidade sazonal, a API espera o valor numérico da porcentagem (ex: 50 para 50%), não decimal (0.5)
  const parsePercentAsNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    const text = String(value).replace(/%/g, '').replace(/\s/g, '').replace(',', '.');
    if (!text || text === '') return null;
    const numeric = Number(text);
    const result = Number.isFinite(numeric) ? numeric : null;
    console.log('🔢 [parsePercentAsNumber] Conversão:', { value, text, numeric, result });
    return result;
  };
  
  console.log('🔍 [contractToServicePayload] Antes de parsear:', {
    seasonalFlexUpperFromRecord,
    seasonalFlexLowerFromRecord,
    contractFlexSazonalSuperior: contract.flexSazonalSuperior,
    contractFlexSazonalInferior: contract.flexSazonalInferior,
  });
  
  const seasonalFlexUpper = seasonalFlexUpperFromRecord ?? 
    (contract.flexSazonalSuperior ? parsePercentAsNumber(contract.flexSazonalSuperior) : null);
  const seasonalFlexLower = seasonalFlexLowerFromRecord ?? 
    (contract.flexSazonalInferior ? parsePercentAsNumber(contract.flexSazonalInferior) : null);
  
  console.log('🔍 [contractToServicePayload] Após parsear:', {
    seasonalFlexUpper,
    seasonalFlexLower,
  });

  // Extrai submarket do record (já processado por contractToApiPayload)
  const submarketValue = typeof record.submarket === 'string' && record.submarket.trim() 
    ? record.submarket.trim() 
    : (contract.submercado && typeof contract.submercado === 'string' ? contract.submercado.trim() : null);

  // Extrai supplierEmail do record (billing_email já processado por contractToApiPayload)
  // O supplierEmail é o mesmo que billing_email conforme especificação do curl
  const supplierEmailValue = typeof record.billing_email === 'string' && record.billing_email.trim()
    ? record.billing_email.trim()
    : (contract.billingEmail && typeof contract.billingEmail === 'string' ? contract.billingEmail.trim() : null);

  console.log('🔍 [contractToServicePayload] Valores extraídos dos novos campos:', {
    submarket: submarketValue,
    supplierEmail: supplierEmailValue,
    seasonalFlexibilityMinPercentage: seasonalFlexLower,
    seasonalFlexibilityUpperPercentage: seasonalFlexUpper,
    contractSubmercado: contract.submercado,
    contractBillingEmail: contract.billingEmail,
    contractFlexSazonalSuperior: contract.flexSazonalSuperior,
    contractFlexSazonalInferior: contract.flexSazonalInferior,
  });

  // Extrai o volume do record (já processado por contractToApiPayload)
  // Se não encontrar no record, tenta extrair do dadosContrato ou calcular
  let volumeValue = pickNullableValue('contracted_volume_mwh');
  
  console.log('🔍 [contractToServicePayload] Volume do record:', volumeValue);
  
  if (!volumeValue || volumeValue === null) {
    // Tenta extrair do dadosContrato
    const volumeField = contract.dadosContrato?.find((item) => 
      /volume/i.test(item.label)
    )?.value;
    
    console.log('🔍 [contractToServicePayload] Volume do dadosContrato:', volumeField);
    
    if (volumeField && volumeField !== 'Não informado') {
      // Extrai o número do campo (ex: "1.000,00 MWh" -> 1000)
      // Remove tudo exceto números, pontos e vírgulas
      const volumeStr = String(volumeField).replace(/[^\d.,]/g, '');
      // Remove pontos (separadores de milhar) e substitui vírgula por ponto
      const volumeNum = volumeStr.replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(volumeNum);
      
      console.log('🔍 [contractToServicePayload] Volume processado:', {
        volumeField,
        volumeStr,
        volumeNum,
        parsed,
      });
      
      if (Number.isFinite(parsed) && parsed > 0) {
        volumeValue = parsed;
        console.log('✅ [contractToServicePayload] Volume extraído do dadosContrato:', volumeValue);
      }
    }
  }
  
  console.log('🔍 [contractToServicePayload] Volume final que será enviado:', volumeValue);
  
  const servicePayload: CreateContractPayload = {
    contract_code: pickString('contract_code', contract.codigo || contract.id),
    client_name: pickString('client_name', contract.cliente),
    legal_name: pickString('legal_name', contract.razaoSocial ?? ''),
    cnpj: pickString('cnpj', contract.cnpj),
    segment: pickString('segment', contract.segmento),
    contact_responsible: pickString('contact_responsible', contract.contato),
    contracted_volume_mwh: volumeValue,
    status: pickString('status', contract.status),
    energy_source: pickString('energy_source', contract.fonte),
    contracted_modality: pickString('contracted_modality', contract.modalidade),
    start_date: pickString('start_date', contract.inicioVigencia),
    end_date: pickString('end_date', contract.fimVigencia),
    billing_cycle: pickString('billing_cycle', contract.cicloFaturamento),
    upper_limit_percent: pickNullableValue('upper_limit_percent'),
    lower_limit_percent: pickNullableValue('lower_limit_percent'),
    flexibility_percent: pickNullableValue('flexibility_percent'),
    average_price_mwh: pickNullableValue('average_price_mwh'),
    balance_email: pickString('balance_email', contract.balanceEmail ?? ''),
    billing_email: pickString('billing_email', contract.billingEmail ?? ''),
    supplier: (record.supplier ?? null) as string | null,
    groupName: pickString('groupName', 'default') || 'default',
    spot_price_ref_mwh: pickNullableValue('spot_price_ref_mwh'),
    compliance_consumption: pickNullableValue('compliance_consumption'),
    compliance_nf: pickNullableValue('compliance_nf'),
    compliance_invoice: pickNullableValue('compliance_invoice'),
    compliance_charges: pickNullableValue('compliance_charges'),
    compliance_overall: pickNullableValue('compliance_overall'),
    // PRIORIDADE: periodPrice.price_periods > price_periods (raiz)
    price_periods: (() => {
      // Tenta pegar de periodPrice primeiro (atualizado pelo modal)
      if (record.periodPrice && typeof record.periodPrice === 'object') {
        const periodPriceRecord = record.periodPrice as { price_periods?: unknown };
        if (typeof periodPriceRecord.price_periods === 'string' && periodPriceRecord.price_periods.trim() && periodPriceRecord.price_periods.trim() !== 'null') {
          console.log('[contractToServicePayload] ✅ Usando periodPrice.price_periods:', {
            length: periodPriceRecord.price_periods.length,
            preview: periodPriceRecord.price_periods.substring(0, 100),
          });
          return periodPriceRecord.price_periods;
        }
      }
      // Fallback para price_periods na raiz
      if (typeof record.price_periods === 'string' && record.price_periods.trim() && record.price_periods.trim() !== 'null') {
        console.log('[contractToServicePayload] ✅ Usando price_periods (raiz):', {
          length: record.price_periods.length,
        });
        return record.price_periods;
      }
      console.log('[contractToServicePayload] ⚠️ Nenhum price_periods válido encontrado');
      return null;
    })(),
    flat_price_mwh: pickNullableValue('flat_price_mwh'),
    flat_years: pickNullableValue('flat_years'),
    // Novos campos solicitados
    submarket: submarketValue,
    supplierEmail: supplierEmailValue,
    seasonalFlexibilityMinPercentage: seasonalFlexLower,
    seasonalFlexibilityUpperPercentage: seasonalFlexUpper,
    // Adiciona periodPrice como objeto (formato do backend)
    periodPrice: (() => {
      if (record.periodPrice && typeof record.periodPrice === 'object') {
        const periodPriceRecord = record.periodPrice as {
          price_periods?: unknown;
          flat_price_mwh?: unknown;
          flat_years?: unknown;
        };
        const pricePeriodsValue =
          typeof periodPriceRecord.price_periods === 'string' && periodPriceRecord.price_periods.trim() && periodPriceRecord.price_periods.trim() !== 'null'
            ? periodPriceRecord.price_periods
            : typeof record.price_periods === 'string' && record.price_periods.trim() && record.price_periods.trim() !== 'null'
            ? record.price_periods
            : null;
        const flatPriceValue =
          typeof periodPriceRecord.flat_price_mwh === 'number' && Number.isFinite(periodPriceRecord.flat_price_mwh)
            ? periodPriceRecord.flat_price_mwh
            : typeof record.flat_price_mwh === 'number' && Number.isFinite(record.flat_price_mwh)
            ? record.flat_price_mwh
            : typeof record.flat_price_mwh === 'string'
            ? (() => {
                const parsed = Number(record.flat_price_mwh);
                return Number.isFinite(parsed) ? parsed : null;
              })()
            : null;
        const flatYearsValue =
          typeof periodPriceRecord.flat_years === 'number' && Number.isFinite(periodPriceRecord.flat_years)
            ? periodPriceRecord.flat_years
            : typeof record.flat_years === 'number' && Number.isFinite(record.flat_years)
            ? record.flat_years
            : typeof record.flat_years === 'string'
            ? (() => {
                const parsed = Number(record.flat_years);
                return Number.isFinite(parsed) ? parsed : null;
              })()
            : null;
        return {
          price_periods: pricePeriodsValue,
          flat_price_mwh: flatPriceValue,
          flat_years: flatYearsValue,
        };
      }
      return {
        price_periods: null,
        flat_price_mwh: null,
        flat_years: null,
      };
    })(),
    // Vencimento da NF - extrai do record (já processado por contractToApiPayload)
    nf_vencimento_tipo: typeof record.nf_vencimento_tipo === 'string' && record.nf_vencimento_tipo.trim()
      ? (record.nf_vencimento_tipo as 'dias_uteis' | 'dias_corridos')
      : (contract.nfVencimentoTipo || null),
    nf_vencimento_dias: typeof record.nf_vencimento_dias === 'number' && Number.isFinite(record.nf_vencimento_dias)
      ? record.nf_vencimento_dias
      : (contract.nfVencimentoDias !== undefined ? contract.nfVencimentoDias : null),
  };
  
  console.log('🔍 [contractToServicePayload] Campos de vencimento da NF:', {
    nf_vencimento_tipo: servicePayload.nf_vencimento_tipo,
    nf_vencimento_dias: servicePayload.nf_vencimento_dias,
    recordNfVencimentoTipo: record.nf_vencimento_tipo,
    recordNfVencimentoDias: record.nf_vencimento_dias,
    contractNfVencimentoTipo: contract.nfVencimentoTipo,
    contractNfVencimentoDias: contract.nfVencimentoDias,
  });
  
  return servicePayload;
};

const buildDeletePayload = (contract: ContractMock): Record<string, unknown> => ({
  client: normalizeString(contract.cliente) || contract.id,
  price: parseNumericInput(contract.precoMedio) ?? contract.precoMedio ?? 0,
  adjusted: Boolean(parsePercentInput(contract.flex)),
  contact_active: Boolean(normalizeString(contract.contato)),
});

const requestContractApi = async (
  endpoints: string[],
  method: 'POST' | 'PUT' | 'DELETE',
  payload?: Record<string, unknown>
): Promise<unknown> => {
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          ...baseHeaders,
          ...(payload ? { 'Content-Type': 'application/json' } : {}),
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(message || `${method} ${endpoint} falhou com status ${response.status}`);
      }

      const text = await response.text().catch(() => '');
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error('[ContractsContext] Falha ao interpretar resposta da API.', parseError);
        return null;
      }
    } catch (error) {
      lastError = error;
      console.error(`[ContractsContext] Falha ao executar ${method} em ${endpoint}.`, error);
    }
  }

  throw (lastError instanceof Error ? lastError : new Error('Falha na requisição da API de contratos.'));
};

const createContractInApi = async (contract: ContractMock): Promise<ContractMock> => {
  console.log('🎯 [createContractInApi] Iniciando criação de contrato na API');
  console.log('🎯 [createContractInApi] Contrato recebido:', {
    id: contract.id,
    codigo: contract.codigo,
    cliente: contract.cliente,
    submercado: contract.submercado,
    flexSazonalSuperior: contract.flexSazonalSuperior,
    flexSazonalInferior: contract.flexSazonalInferior,
    nfVencimentoTipo: contract.nfVencimentoTipo,
    nfVencimentoDias: contract.nfVencimentoDias,
  });
  
  // Sempre usa createContractService quando disponível, pois ele usa apiClient que já está configurado
  // com a URL correta (NGROK_API_BASE_URL para /contracts)
  console.log('🎯 [createContractInApi] Usando createContractService (apiClient)...');
  try {
    const servicePayload = contractToServicePayload(contract);
    console.log('🎯 [createContractInApi] Chamando createContractService com payload...');
    const created = await createContractService(servicePayload);
    console.log('🎯 [createContractInApi] Resposta recebida de createContractService');
    
    // createContractService retorna um Contract único, não um array
    // Precisamos normalizar como se fosse um array com um único item
    const normalized = normalizeContractsFromApi(
      Array.isArray(created) ? created : { contracts: [created] }
    );
    
    console.log('🎯 [createContractInApi] Normalizado:', { 
      normalizedLength: normalized.length, 
      hasFirst: !!normalized[0] 
    });
    
    if (normalized[0]) {
      console.log('✅ [createContractInApi] Contrato criado com sucesso via createContractService - RETORNANDO');
      return normalized[0];
    }
    // Se não conseguiu normalizar, lança erro para ir ao fallback
    throw new Error('Não foi possível normalizar o contrato retornado pela API');
  } catch (serviceError) {
    console.error('❌ [createContractInApi] Erro em createContractService:', serviceError);
    // Se falhar, tenta o fallback
    console.log('🎯 [createContractInApi] Tentando fallback requestContractApi...');
    
    const writeBaseUrl = resolveWriteApiUrl();
    const payload = contractToApiPayload(contract);
    const endpoints = buildEndpointCandidates(writeBaseUrl);
    const response = await requestContractApi(endpoints, 'POST', payload);
    
    if (!response) {
      return contract;
    }
    const normalized = normalizeContractsFromApi({ contracts: Array.isArray(response) ? response : [response] });
    return normalized[0] ?? contract;
  }
};

/**
 * Sincroniza os balanços energéticos após criar/atualizar um contrato.
 * Busca balanços pelo medidor do contrato e atualiza os campos relevantes.
 */
const syncEnergyBalancesAfterContractSave = async (contract: ContractMock): Promise<void> => {
  try {
    // Extrair medidor do contrato
    const medidor = contract.dadosContrato?.find((item) => {
      const label = item.label.toLowerCase();
      return label.includes('medidor') || label.includes('meter') || label.includes('grupo');
    })?.value;

    if (!medidor || medidor === 'Não informado') {
      console.log('[ContractsContext] ⏭️ Contrato sem medidor, pulando sincronização de balanços');
      return;
    }

    console.log('[ContractsContext] 🔄 Sincronizando balanços para medidor:', medidor);

    // Buscar todos os balanços
    const balances = await getEnergyBalanceList();
    
    if (!balances || balances.length === 0) {
      console.log('[ContractsContext] ℹ️ Nenhum balanço encontrado no sistema');
      return;
    }

    // Filtrar balanços pelo medidor
    const matchingBalances = balances.filter((balance) => {
      const balanceMeter = balance.meter || balance.medidor || balance.groupName || '';
      return balanceMeter.toLowerCase().trim() === medidor.toLowerCase().trim();
    });

    if (matchingBalances.length === 0) {
      console.log('[ContractsContext] ℹ️ Nenhum balanço encontrado para o medidor:', medidor);
      return;
    }

    console.log(`[ContractsContext] 📊 Encontrados ${matchingBalances.length} balanços para atualizar`);

    // Parsear price_periods do contrato para extrair volumes por mês
    const pricePeriodsJson = contract.periodPrice?.price_periods;
    const monthDataMap = new Map<string, {
      volumeSeasonalizedMWh: number | null;
      flexibilityMaxMWh: number | null;
      flexibilityMinMWh: number | null;
      price: number | null;
    }>();

    if (pricePeriodsJson) {
      try {
        let parsed = typeof pricePeriodsJson === 'string' 
          ? JSON.parse(pricePeriodsJson) 
          : pricePeriodsJson;
        
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }

        if (parsed?.periods) {
          parsed.periods.forEach((period: { months?: Array<{
            ym: string;
            volumeSeasonalizedMWh?: number;
            flexibilityMaxMWh?: number;
            flexibilityMinMWh?: number;
            price?: number;
          }> }) => {
            period.months?.forEach((month) => {
              if (month.ym) {
                monthDataMap.set(month.ym, {
                  volumeSeasonalizedMWh: month.volumeSeasonalizedMWh ?? null,
                  flexibilityMaxMWh: month.flexibilityMaxMWh ?? null,
                  flexibilityMinMWh: month.flexibilityMinMWh ?? null,
                  price: month.price ?? null,
                });
              }
            });
          });
        }
      } catch (parseError) {
        console.warn('[ContractsContext] ⚠️ Erro ao parsear price_periods:', parseError);
      }
    }

    // Atualizar cada balanço encontrado
    for (const balance of matchingBalances) {
      try {
        const balanceId = balance.id;
        if (!balanceId) continue;

        // Extrair o mês do balanço (formato YYYY-MM)
        const balanceMonth = balance.month || balance.mes || balance.referenceBase;
        let balanceYM: string | null = null;

        if (balanceMonth) {
          // Tenta extrair YYYY-MM
          const isoMatch = String(balanceMonth).match(/(\d{4})-(\d{2})/);
          if (isoMatch) {
            balanceYM = `${isoMatch[1]}-${isoMatch[2]}`;
          } else {
            // Tenta parsear formato "jan. 2025" ou similar
            const monthNames: Record<string, string> = {
              'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
              'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
              'set': '09', 'out': '10', 'nov': '11', 'dez': '12',
            };
            const ptBrMatch = String(balanceMonth).toLowerCase().match(/([a-z]{3})\.?\s*(\d{4})/);
            if (ptBrMatch && monthNames[ptBrMatch[1]]) {
              balanceYM = `${ptBrMatch[2]}-${monthNames[ptBrMatch[1]]}`;
            }
          }
        }

        // Buscar dados do mês no contrato
        const monthData = balanceYM ? monthDataMap.get(balanceYM) : null;

        if (!monthData) {
          console.log(`[ContractsContext] ⏭️ Balanço ${balanceId} (${balanceYM}): mês não encontrado no contrato`);
          continue;
        }

        // Preparar payload de atualização
        const updatePayload: Record<string, unknown> = {};
        
        if (monthData.volumeSeasonalizedMWh !== null) {
          updatePayload.contract = monthData.volumeSeasonalizedMWh;
          updatePayload.contrato = monthData.volumeSeasonalizedMWh;
        }
        if (monthData.flexibilityMaxMWh !== null) {
          updatePayload.maxDemand = monthData.flexibilityMaxMWh;
          updatePayload.max_demand = monthData.flexibilityMaxMWh;
          updatePayload.maximo = monthData.flexibilityMaxMWh;
        }
        if (monthData.flexibilityMinMWh !== null) {
          updatePayload.minDemand = monthData.flexibilityMinMWh;
          updatePayload.min_demand = monthData.flexibilityMinMWh;
          updatePayload.minimo = monthData.flexibilityMinMWh;
        }
        if (monthData.price !== null) {
          updatePayload.price = monthData.price;
          updatePayload.preco = monthData.price;
        }

        // Só atualiza se tiver algo para enviar
        if (Object.keys(updatePayload).length === 0) {
          console.log(`[ContractsContext] ⏭️ Balanço ${balanceId}: nenhum dado para atualizar`);
          continue;
        }

        console.log(`[ContractsContext] 📤 Atualizando balanço ${balanceId} (${balanceYM}):`, updatePayload);

        await energyBalanceRequest(`/energy-balance/${balanceId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify(updatePayload),
        });

        console.log(`[ContractsContext] ✅ Balanço ${balanceId} atualizado com sucesso`);
      } catch (balanceError) {
        console.warn(`[ContractsContext] ⚠️ Erro ao atualizar balanço ${balance.id}:`, balanceError);
        // Continua para o próximo balanço
      }
    }

    console.log('[ContractsContext] ✅ Sincronização de balanços concluída');
  } catch (error) {
    console.error('[ContractsContext] ❌ Erro ao sincronizar balanços:', error);
    // Não propaga o erro para não afetar o salvamento do contrato
  }
};

const updateContractInApi = async (contract: ContractMock): Promise<ContractMock> => {
  const writeBaseUrl = resolveWriteApiUrl();
  const shouldUseService = !isAbsoluteUrl(writeBaseUrl);
  const id = normalizeString(contract.id);
  if (shouldUseService && id) {
    try {
      const updated = await updateContractService(id, contractToServicePayload(contract));
      const normalizedFromService = normalizeContractsFromApi(updated);
      const match = normalizedFromService.find((item) => item.id === contract.id);
      if (match) {
        return match;
      }
      if (normalizedFromService[0]) {
        return normalizedFromService[0];
      }
    } catch (serviceError) {
      console.error('[ContractsContext] Falha ao atualizar contrato via apiClient.', serviceError);
    }
  }

  const payload = contractToApiPayload(contract);
  const endpoints = id
    ? buildResourceEndpointCandidates(writeBaseUrl, id)
    : buildEndpointCandidates(writeBaseUrl);
  const response = await requestContractApi(endpoints, 'PUT', payload);
  if (!response) {
    return contract;
  }
  const normalized = normalizeContractsFromApi({ contracts: Array.isArray(response) ? response : [response] });
  return normalized.find((item) => item.id === contract.id) ?? normalized[0] ?? contract;
};

const deleteContractInApi = async (contract: ContractMock): Promise<void> => {
  const writeBaseUrl = resolveWriteApiUrl();
  const shouldUseService = !isAbsoluteUrl(writeBaseUrl);
  const id = normalizeString(contract.id);
  if (shouldUseService && id) {
    try {
      await deleteContractService(id);
      return;
    } catch (serviceError) {
      console.error('[ContractsContext] Falha ao excluir contrato via apiClient.', serviceError);
    }
  }
  const endpoints = [
    ...(id ? buildResourceEndpointCandidates(writeBaseUrl, id) : []),
    ...buildEndpointCandidates(writeBaseUrl),
  ];
  await requestContractApi(endpoints, 'DELETE', buildDeletePayload(contract));
};

async function fetchContracts(signal?: AbortSignal): Promise<ContractMock[]> {
  const rawUrl = resolveReadApiUrl();
  const endpoints = buildEndpointCandidates(rawUrl);
  const hasAbsoluteEndpoint = endpoints.some((endpoint) => isAbsoluteUrl(endpoint));

  if (hasAbsoluteEndpoint) {
    return fetchContractsFromEndpoints(endpoints, signal);
  }

  let lastError: unknown;

  try {
        const apiContracts = await listContractsService({ signal });
        const normalized = normalizeContractsFromApi(apiContracts);
        if (normalized.length) {
      return normalized;
    }
    console.warn('[ContractsContext] API retornou lista vazia de contratos.');
    return normalized;
  } catch (serviceError) {
    if (signal?.aborted) {
      throw serviceError;
    }
    lastError = serviceError;
    console.error('[ContractsContext] Falha ao buscar contratos via apiClient.', serviceError);
  }

  const fallbackEndpoints = Array.from(
    new Set([...endpoints, ...buildEndpointCandidates(DEFAULT_API_URL)])
  );

  try {
    return await fetchContractsFromEndpoints(fallbackEndpoints, signal);
  } catch (error) {
    if (signal?.aborted) {
      throw error instanceof Error ? error : new Error(String(error));
    }
    lastError = error;
  }

  throw (lastError instanceof Error
    ? lastError
    : new Error('Erro desconhecido ao carregar contratos'));
}

export type ContractUpdater = (contract: ContractMock) => ContractMock;

type ContractsContextValue = {
  contracts: ContractMock[];
  isLoading: boolean;
  error: string | null;
  updateContract: (
    id: string,
    updater: ContractUpdater | Partial<ContractMock>
  ) => Promise<ContractMock | undefined>;
  getContractById: (id: string) => ContractMock | undefined;
  addContract: (contract: ContractMock) => Promise<ContractMock>;
  deleteContract: (id: string) => Promise<void>;
  refreshContracts: () => Promise<void>;
};

const ContractsContext = React.createContext<ContractsContextValue | undefined>(undefined);

function applyUpdate(contract: ContractMock, update: ContractUpdater | Partial<ContractMock>): ContractMock {
  if (typeof update === 'function') {
    return update(contract);
  }
  return {
    ...contract,
    ...update,
  };
}

function cloneContract(contract: ContractMock): ContractMock {
  return JSON.parse(JSON.stringify(contract)) as ContractMock;
}

export function ContractsProvider({ children }: { children: React.ReactNode }) {
  const [contracts, setContracts] = React.useState<ContractMock[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadContracts = React.useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const apiContracts = await fetchContracts(signal);
        if (signal?.aborted) return;
        setContracts(apiContracts.map((contract) => cloneContract(contract)));
        setError(null);
      } catch (err) {
        if (signal?.aborted) return;
        console.error('[ContractsProvider] Falha ao buscar contratos da API.', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar contratos');
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  React.useEffect(() => {
    const controller = new AbortController();
    loadContracts(controller.signal);
    return () => controller.abort();
  }, [loadContracts]);

  const refreshContracts = React.useCallback(async () => {
    await loadContracts();
  }, [loadContracts]);

  const addContract = React.useCallback(async (contract: ContractMock) => {
    console.log('📝 [addContract] Iniciando adição de contrato');
    console.log('📝 [addContract] Contrato recebido:', {
      id: contract.id,
      codigo: contract.codigo,
      cliente: contract.cliente,
      submercado: contract.submercado,
      flexSazonalSuperior: contract.flexSazonalSuperior,
      flexSazonalInferior: contract.flexSazonalInferior,
      billingEmail: contract.billingEmail,
    });
    
    const draft = cloneContract(contract);
    console.log('📝 [addContract] Draft clonado, chamando createContractInApi...');
    
    try {
      const saved = await createContractInApi(draft);
      console.log('📝 [addContract] Contrato salvo na API:', saved);
      
      const savedWithTimestamps = (() => {
        if (saved.createdAt && saved.updatedAt) {
          return saved;
        }
        const nowIso = new Date().toISOString();
        return {
          ...saved,
          createdAt: saved.createdAt ?? saved.updatedAt ?? nowIso,
          updatedAt: saved.updatedAt ?? saved.createdAt ?? nowIso,
        };
      })();
      
      setContracts((prev) => {
        const next: ContractMock[] = [];
        const seen = new Set<string>();

        const register = (item: ContractMock) => {
          const key = normalizeString(item.id) || `code:${normalizeString(item.codigo)}`;
          if (seen.has(key)) {
            return;
          }
          seen.add(key);
          next.push(cloneContract(item));
        };

        register(savedWithTimestamps);
        prev.forEach(register);

        return next;
      });
      setError(null);
      
      // Sincronizar balanços energéticos após criar o contrato
      void syncEnergyBalancesAfterContractSave(savedWithTimestamps);
      
      return savedWithTimestamps;
    } catch (apiError) {
      console.error('[ContractsProvider] ❌ Falha ao criar contrato na API:', apiError);
      console.error('[ContractsProvider] ❌ Tipo do erro:', typeof apiError);
      console.error('[ContractsProvider] ❌ Stack trace:', apiError instanceof Error ? apiError.stack : 'N/A');
      if (apiError instanceof Error) {
        console.error('[ContractsProvider] ❌ Mensagem do erro:', apiError.message);
        console.error('[ContractsProvider] ❌ Nome do erro:', apiError.name);
      }
      const message =
        apiError instanceof Error ? apiError.message : 'Erro desconhecido ao criar contrato na API';
      setError(message);
      throw apiError instanceof Error ? apiError : new Error(message);
    }
  }, []);

  const updateContract = React.useCallback(
    async (id: string, updater: ContractUpdater | Partial<ContractMock>) => {
      const current = contracts.find((contract) => contract.id === id);
      if (!current) return undefined;

      const updated = applyUpdate(current, updater);
      setContracts((prev) =>
        prev.map((contract) => (contract.id === id ? cloneContract(updated) : contract))
      );

      try {
        const saved = await updateContractInApi(updated);
        setContracts((prev) =>
          prev.map((contract) => (contract.id === saved.id ? cloneContract(saved) : contract))
        );
        setError(null);
        
        // Sincronizar balanços energéticos após atualizar o contrato
        void syncEnergyBalancesAfterContractSave(saved);
        
        return saved;
      } catch (apiError) {
        console.error('[ContractsProvider] Falha ao atualizar contrato na API.', apiError);
        const message =
          apiError instanceof Error ? apiError.message : 'Erro desconhecido ao atualizar contrato na API';
        setError(message);
        setContracts((prev) =>
          prev.map((contract) => (contract.id === current.id ? cloneContract(current) : contract))
        );
        throw apiError instanceof Error ? apiError : new Error(message);
      }
    },
    [contracts]
  );

  const deleteContract = React.useCallback(
    async (id: string) => {
      const current = contracts.find((contract) => contract.id === id);
      if (!current) return;

      setContracts((prev) => prev.filter((contract) => contract.id !== id));

      try {
        await deleteContractInApi(current);
        setError(null);
      } catch (apiError) {
        console.error('[ContractsProvider] Falha ao excluir contrato na API.', apiError);
        const message =
          apiError instanceof Error ? apiError.message : 'Erro desconhecido ao excluir contrato na API';
        setError(message);
        setContracts((prev) => {
          if (prev.some((contract) => contract.id === current.id)) {
            return prev;
          }
          return [cloneContract(current), ...prev];
        });
        throw apiError instanceof Error ? apiError : new Error(message);
      }
    },
    [contracts]
  );

  const getContractById = React.useCallback(
    (id: string) => {
      console.log('[ContractsContext] 🔍 getContractById chamado com id:', id);
      console.log('[ContractsContext] 🔍 Tipo do id:', typeof id);
      console.log('[ContractsContext] 🔍 Total de contratos:', contracts.length);
      
      const found = contracts.find((contract) => {
        const idMatch = contract.id === id || String(contract.id) === String(id);
        const codigoMatch = contract.codigo === id || String(contract.codigo) === String(id);
        return idMatch || codigoMatch;
      });
      
      if (found) {
        console.log('[ContractsContext] ✅ Contrato encontrado:', found.id, found.codigo, found.cliente);
      } else {
        console.log('[ContractsContext] ❌ Contrato NÃO encontrado para id:', id);
        // Lista os primeiros 5 contratos para debug
        console.log('[ContractsContext] 📋 Primeiros 5 contratos:', 
          contracts.slice(0, 5).map(c => ({ id: c.id, codigo: c.codigo, cliente: c.cliente }))
        );
      }
      return found;
    },
    [contracts]
  );

  const value = React.useMemo(
    () => ({
      contracts,
      isLoading,
      error,
      updateContract,
      getContractById,
      addContract,
      deleteContract,
      refreshContracts,
    }),
    [
      contracts,
      isLoading,
      error,
      updateContract,
      getContractById,
      addContract,
      deleteContract,
      refreshContracts,
    ]
  );

  return <ContractsContext.Provider value={value}>{children}</ContractsContext.Provider>;
}

export function useContracts() {
  const context = React.useContext(ContractsContext);
  if (!context) {
    throw new Error('useContracts must be used within ContractsProvider');
  }
  return context;
}
