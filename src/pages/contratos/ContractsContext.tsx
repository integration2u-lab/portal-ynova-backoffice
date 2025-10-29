import React from 'react';
import type { ContractDetails as ContractMock } from '../../types/contracts';
import type { ContractPricePeriods } from '../../types/pricePeriods';
import {
  normalizeAnnualPricePeriods,
  summarizePricePeriods,
  calculateAdjustedPriceDifference,
} from '../../utils/contractPricing';
import {
  createContract as createContractService,
  deleteContract as deleteContractService,
  listContracts as listContractsService,
  updateContract as updateContractService,
  type CreateContractPayload,
} from '../../services/contracts';

const DEFAULT_API_URL = 'https://api-balanco.ynovamarketplace.com/';

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
  const original = normalizeString(value);
  if (!original) {
    return 'Convencional';
  }

  const normalized = removeDiacritics(original).toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (!normalized) {
    return 'Convencional';
  }

  const matches = [
    { key: 'convencional', value: 'Convencional' as ContractMock['fonte'] },
    { key: 'incentivada50', value: 'Incentivada 50%' as ContractMock['fonte'] },
    { key: 'incentivada100', value: 'Incentivada 100%' as ContractMock['fonte'] },
  ];

  for (const { key, value: mapped } of matches) {
    if (normalized === key || normalized.includes(key)) {
      return mapped;
    }
  }

  return original;
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
  const numeric = Number(typeof value === 'string' ? value.replace(',', '.') : value);
  if (!Number.isFinite(numeric)) {
    const text = normalizeString(value);
    if (!text) return '';
    return text.includes('%') ? text : `${text}%`;
  }

  const ratio = Math.abs(numeric) <= 1 ? numeric : numeric / 100;
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
      const helper = normalizeString((item as { helper?: unknown; descricao?: unknown }).helper ?? (item as { descricao?: unknown }).descricao);
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

      return {
        label,
        value: valueText,
        helper: helper || undefined,
        variation:
          variationValue && direction
            ? {
                value: variationValue,
                direction,
              }
            : undefined,
      };
    })
    .filter((item): item is ContractMock['kpis'][number] => Boolean(item));
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
            .map((etapa) => ({
              nome: normalizeEtapaNome((etapa as { nome?: unknown; etapa?: unknown }).nome ?? (etapa as { etapa?: unknown }).etapa),
              status: normalizeAnaliseStatus((etapa as { status?: unknown }).status),
              observacao: normalizeString((etapa as { observacao?: unknown; descricao?: unknown }).observacao ?? (etapa as { descricao?: unknown }).descricao) || undefined,
            }))
            .filter((etapa) => analiseStatusValues.includes(etapa.status))
        : [];
      return {
        area,
        etapas,
      };
    })
    .filter((item): item is ContractMock['analises'][number] => Boolean(item));
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

const normalizePricePeriods = (value: unknown): ContractPricePeriods => {
  const extractArray = (input: unknown): unknown[] => {
    if (Array.isArray(input)) return input;
    if (!input || typeof input !== 'object') return [];
    if (Array.isArray((input as { periods?: unknown }).periods)) {
      return (input as { periods: unknown[] }).periods;
    }
    if (Array.isArray((input as { data?: unknown }).data)) {
      return (input as { data: unknown[] }).data;
    }
    if (Array.isArray((input as { items?: unknown }).items)) {
      return (input as { items: unknown[] }).items;
    }
    return [];
  };

  const rawPeriods = extractArray(value);
  if (!rawPeriods.length) {
    return { periods: [] };
  }

  const normalized = rawPeriods
    .map((item, index) => {
      const id = normalizeString((item as { id?: unknown }).id) || `period-${index + 1}`;
      const start =
        normalizeReferenceMonth(
          (item as { start?: unknown }).start ??
            (item as { start_month?: unknown }).start_month ??
            (item as { inicio?: unknown }).inicio ??
            (item as { month_start?: unknown }).month_start
        ) || '';
      const end =
        normalizeReferenceMonth(
          (item as { end?: unknown }).end ??
            (item as { end_month?: unknown }).end_month ??
            (item as { fim?: unknown }).fim ??
            (item as { month_end?: unknown }).month_end
        ) || '';
      const defaultPrice =
        parseNumericInput(
          (item as { defaultPrice?: unknown }).defaultPrice ??
            (item as { default_price?: unknown }).default_price ??
            (item as { default_price_mwh?: unknown }).default_price_mwh ??
            (item as { price?: unknown }).price
        ) ?? null;

      const monthsRaw =
        (item as { months?: unknown }).months ??
        (item as { valores?: unknown }).valores ??
        (item as { prices?: unknown }).prices ??
        (item as { meses?: unknown }).meses;

      let months: ContractPricePeriods['periods'][number]['months'] = [];

      if (Array.isArray(monthsRaw)) {
        months = monthsRaw
          .map((month) => {
            const ym = normalizeReferenceMonth(
              (month as { ym?: unknown }).ym ??
                (month as { month?: unknown }).month ??
                (month as { competencia?: unknown }).competencia
            );
            if (!ym) return null;
            const price =
              parseNumericInput(
                (month as { price?: unknown }).price ??
                  (month as { valor?: unknown }).valor ??
                  (month as { value?: unknown }).value
              ) ?? null;
            return { ym, price };
          })
          .filter((month): month is { ym: string; price: number | null } => Boolean(month));
      } else if (monthsRaw && typeof monthsRaw === 'object') {
        months = Object.entries(monthsRaw as Record<string, unknown>)
          .map(([key, value]) => {
            const ym = normalizeReferenceMonth(key);
            if (!ym) return null;
            return { ym, price: parseNumericInput(value) ?? null };
          })
          .filter((month): month is { ym: string; price: number | null } => Boolean(month));
      }

      const fallbackStart = start || (months.length ? months[0]!.ym : `${new Date().getFullYear()}-01`);
      const fallbackEnd = end || (months.length ? months[months.length - 1]!.ym : fallbackStart);

      return {
        id,
        start: fallbackStart,
        end: fallbackEnd,
        defaultPrice,
        months: months.map((month) => ({ ym: month.ym, price: month.price })),
      };
    })
    .filter((period) => period.start);

  return normalizeAnnualPricePeriods({ periods: normalized });
};

const normalizeContractsFromApi = (payload: unknown): ContractMock[] => {
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
    const rawRazao =
      (item as { razao_social?: unknown }).razao_social ??
      (item as { razaoSocial?: unknown }).razaoSocial ??
      (item as { corporate_name?: unknown }).corporate_name ??
      (item as { corporateName?: unknown }).corporateName ??
      (item as { razao?: unknown }).razao ??
      rawCliente;
    const razaoSocial = normalizeString(rawRazao) || normalizeString(rawCliente);
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
    const pricePeriodsRaw =
      (item as { pricePeriods?: unknown }).pricePeriods ??
      (item as { price_periods?: unknown }).price_periods ??
      (item as { precosPeriodo?: unknown }).precosPeriodo ??
      (item as { precos_periodos?: unknown }).precos_periodos;
    const pricePeriods = normalizePricePeriods(pricePeriodsRaw);
    const precoReajustadoDireto = parseNumericInput(
      (item as { preco_reajustado?: unknown }).preco_reajustado ??
        (item as { precoReajustado?: unknown }).precoReajustado ??
        (item as { adjusted_price_delta?: unknown }).adjusted_price_delta ??
        (item as { price_adjusted_delta_mwh?: unknown }).price_adjusted_delta_mwh
    );
    const precoReajustadoValor =
      precoReajustadoDireto ?? calculateAdjustedPriceDifference(pricePeriods, precoMedio);
    const situacaoVigenciaRaw = normalizeString(
      (item as { situacao_vigencia?: unknown }).situacao_vigencia ??
        (item as { vigencia_status?: unknown }).vigencia_status ??
        (item as { situacaoVigencia?: unknown }).situacaoVigencia ??
        (item as { status_vigencia?: unknown }).status_vigencia
    );
    let situacaoVigencia: 'Vigente' | 'Encerrado' | undefined;
    if (situacaoVigenciaRaw) {
      const normalizedStatus = removeDiacritics(situacaoVigenciaRaw).toLowerCase();
      if (normalizedStatus.includes('encerr')) {
        situacaoVigencia = 'Encerrado';
      } else if (normalizedStatus.includes('vigente') || normalizedStatus.includes('ativo')) {
        situacaoVigencia = 'Vigente';
      }
    }

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

    const situacaoVigenciaFinal = (() => {
      if (situacaoVigencia) return situacaoVigencia;
      if (fimVigencia) {
        const endDate = new Date(`${fimVigencia}T00:00:00`);
        if (!Number.isNaN(endDate.getTime()) && endDate < new Date()) {
          return 'Encerrado';
        }
      }
      return 'Vigente';
    })();

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
    const ensureField = (label: string, value: string) => {
      const normalizedLabel = removeDiacritics(label);
      const finalValue = normalizeString(value);
      if (!finalValue) return;
      if (!dadosContratoKeys.has(normalizedLabel)) {
        dadosContratoKeys.add(normalizedLabel);
        dadosContratoBase.push({ label, value: finalValue });
      }
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

    const supplierDisplay = supplier || 'Não informado';
    ensureField('Razão social', razaoSocial || normalizeString(rawCliente));
    ensureField('Fornecedor', supplierDisplay);
    ensureField('Proinfa', formatProinfa(proinfa));
    ensureField('Medidor', meter || 'Não informado');
    ensureField('Preço (R$/MWh)', precoMedio ? formatCurrencyBRL(precoMedio) : 'Não informado');
    ensureField('Código do contrato', normalizeString(rawCodigo));
    ensureField('Cliente ID', clientId || 'Não informado');
    ensureField('Volume contratado', formatMwhValue(contractedVolume));
    ensureField(
      'Flex / Limites',
      [formatPercentValue(flexValue), formatPercentValue(lowerLimitRaw), formatPercentValue(upperLimitRaw)]
        .filter(Boolean)
        .join(' · ')
    );
    ensureField('Ciclo de faturamento', normalizeString(ciclo) || 'Não informado');
    ensureField('Status', status);
    ensureField('Segmento', normalizeString(rawSegmento));
    ensureField('Responsável', normalizeString(rawContato) || 'Não informado');
    const fonteValue = normalizeFonte(
      (item as { fonte?: unknown }).fonte ?? (item as { energy_source?: unknown }).energy_source
    );
    ensureField('Fonte de energia', fonteValue || 'Não informado');
    ensureField('Modalidade', normalizeString((item as { contracted_modality?: unknown }).contracted_modality) || 'Não informado');
    ensureField('Preço spot referência', normalizeString((item as { spot_price_ref_mwh?: unknown }).spot_price_ref_mwh) || 'Não informado');
    ensureField('Situação da vigência', situacaoVigenciaFinal);
    ensureField('Preço reajustado (diferença)', formatCurrencyBRL(precoReajustadoValor));
    
    // Add compliance fields
    ensureField('Conformidade consumo', normalizeString((item as { compliance_consumption?: unknown }).compliance_consumption) || 'Não informado');
    ensureField('Conformidade NF', normalizeString((item as { compliance_nf?: unknown }).compliance_nf) || 'Não informado');
    ensureField('Conformidade fatura', normalizeString((item as { compliance_invoice?: unknown }).compliance_invoice) || 'Não informado');
    ensureField('Conformidade encargos', normalizeString((item as { compliance_charges?: unknown }).compliance_charges) || 'Não informado');
    ensureField('Conformidade geral', normalizeString((item as { compliance_overall?: unknown }).compliance_overall) || 'Não informado');
    
    if (adjusted !== undefined) {
      ensureField('Ajustado', adjusted ? 'Sim' : 'Não');
    }
    if (referenceBaseRaw) {
      ensureField('Base de referência', normalizeIsoDate(referenceBaseRaw) || normalizeString(referenceBaseRaw));
    }
    ensureField('Início da vigência', inicioVigencia);
    ensureField('Fim da vigência', fimVigencia);
    ensureField('Criado em', normalizeIsoDate((item as { created_at?: unknown }).created_at));
    ensureField('Atualizado em', normalizeIsoDate((item as { updated_at?: unknown }).updated_at));

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

    return {
      id,
      codigo: normalizeString(rawCodigo),
      razaoSocial: razaoSocial,
      cliente: normalizeString(rawCliente),
      cnpj: normalizeString((item as { cnpj?: unknown }).cnpj),
      segmento: normalizeString(rawSegmento),
      contato: contatoFinal,
      status: statusValor,
      fonte: normalizeFonte((item as { fonte?: unknown }).fonte ?? (item as { energy_source?: unknown }).energy_source),
      modalidade:
        normalizeString(
          (item as { modalidade?: unknown }).modalidade ?? (item as { contracted_modality?: unknown }).contracted_modality
        ) || 'Não informado',
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
      precoMedio,
      fornecedor: supplier,
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
      pricePeriods,
      precoReajustado: precoReajustadoValor,
      situacaoVigencia: situacaoVigenciaFinal,
    } satisfies ContractMock;
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
        const message = await response.text().catch(() => '');
        throw new Error(
          message || `[ContractsContext] Erro ao buscar contratos em ${endpoint} (status ${response.status}).`
        );
      }

      const data = await response.json().catch(() => null);
      const contracts = normalizeContractsFromApi(data);
      if (!contracts.length) {
        console.warn('[ContractsContext] API retornou lista vazia de contratos.');
      }
      console.info(
        `[ContractsContext] Contratos carregados com sucesso: ${contracts.length} itens recebidos de ${endpoint}.`
      );
      return contracts;
    } catch (error) {
      if (signal?.aborted) {
        throw error instanceof Error ? error : new Error(String(error));
      }
      lastError = error;
      console.error(
        `[ContractsContext] Erro ao buscar contratos em ${endpoint}.`,
        error instanceof Error ? error : new Error(String(error))
      );
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error(
          '[ContractsContext] Falha de rede ao buscar contratos. Possível problema de CORS ou indisponibilidade da API.'
        );
      }
      console.info('[ContractsContext] Tentando próximo endpoint disponível...');
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

  const supplier = findDadosValue(['fornecedor', 'supplier']);
  // also accept 'medidor' label as groupName
  const groupName = findDadosValue(['grupo', 'group', 'medidor', 'meter']);
  const razaoFromDados = findDadosValue(['razao', 'razão', 'corporate']);
  const volumeField =
    contract.dadosContrato.find((item) => /volume/i.test(item.label))?.value ?? contract.flex;
  const contractedVolume = parseNumericInput(volumeField);
  const supplierFromContract = normalizeString(contract.fornecedor);
  const supplierValue = supplierFromContract || supplier || '';
  const corporateNameValue = normalizeString(contract.razaoSocial || razaoFromDados || contract.cliente);
  const proinfaField = findDadosValue(['proinfa']);
  const proinfaFromDados = parseNumericInput(proinfaField);
  const proinfaValue =
    contract.proinfa !== null && contract.proinfa !== undefined
      ? contract.proinfa
      : proinfaFromDados;

  const payload: Record<string, unknown> = {
    contract_code: normalizeString(contract.codigo) || contract.id,
    corporate_name: corporateNameValue || undefined,
    client_name: normalizeString(contract.cliente),
    groupName: groupName || 'default',
    supplier: supplierValue ? supplierValue : null,
    cnpj: normalizeString(contract.cnpj),
    segment: normalizeString(contract.segmento),
    contact_responsible: normalizeString(contract.contato),
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
  };

  const normalizedPricePeriods = normalizeAnnualPricePeriods(contract.pricePeriods);
  if (normalizedPricePeriods.periods.length) {
    payload.price_periods = normalizedPricePeriods.periods.map((period) => ({
      id: period.id,
      start_month: period.start,
      end_month: period.end,
      default_price_mwh: period.defaultPrice ?? undefined,
      months: period.months.map((month) => ({
        month: month.ym,
        price: month.price,
      })),
    }));
  }
  if (contract.precoReajustado !== undefined && contract.precoReajustado !== null) {
    payload.price_adjusted_delta_mwh = contract.precoReajustado;
  }
  if (contract.situacaoVigencia) {
    payload.vigencia_status = contract.situacaoVigencia;
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => {
      if (key === 'supplier' || key === 'proinfa_contribution') {
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
    return value as string | number | null;
  };

  return {
    contract_code: pickString('contract_code', contract.codigo || contract.id),
    corporate_name: pickString('corporate_name', contract.razaoSocial || contract.cliente),
    client_name: pickString('client_name', contract.cliente),
    cnpj: pickString('cnpj', contract.cnpj),
    segment: pickString('segment', contract.segmento),
    contact_responsible: pickString('contact_responsible', contract.contato),
    contracted_volume_mwh: record.contracted_volume_mwh ?? null,
    status: pickString('status', contract.status),
    energy_source: pickString('energy_source', contract.fonte),
    contracted_modality: pickString('contracted_modality', contract.modalidade),
    start_date: pickString('start_date', contract.inicioVigencia),
    end_date: pickString('end_date', contract.fimVigencia),
    billing_cycle: pickString('billing_cycle', contract.cicloFaturamento),
    upper_limit_percent: record.upper_limit_percent ?? null,
    lower_limit_percent: record.lower_limit_percent ?? null,
    flexibility_percent: record.flexibility_percent ?? null,
    average_price_mwh: record.average_price_mwh ?? null,
    supplier: (record.supplier ?? null) as string | null,
    proinfa_contribution: record.proinfa_contribution ?? null,
    groupName: pickString('groupName', 'default') || 'default',
    spot_price_ref_mwh: record.spot_price_ref_mwh ?? null,
    compliance_consumption: pickNullableValue('compliance_consumption'),
    compliance_nf: pickNullableValue('compliance_nf'),
    compliance_invoice: pickNullableValue('compliance_invoice'),
    compliance_charges: pickNullableValue('compliance_charges'),
    compliance_overall: pickNullableValue('compliance_overall'),
  };
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
  const writeBaseUrl = resolveWriteApiUrl();
  const shouldUseService = !isAbsoluteUrl(writeBaseUrl);

  if (shouldUseService) {
    try {
      const created = await createContractService(contractToServicePayload(contract));
      const normalized = normalizeContractsFromApi(created);
      if (normalized[0]) {
        return normalized[0];
      }
    } catch (serviceError) {
      console.error('[ContractsContext] Falha ao criar contrato via apiClient.', serviceError);
    }
  }

  const payload = contractToApiPayload(contract);
  const endpoints = buildEndpointCandidates(writeBaseUrl);
  const response = await requestContractApi(endpoints, 'POST', payload);
  if (!response) {
    return contract;
  }
  const normalized = normalizeContractsFromApi({ contracts: Array.isArray(response) ? response : [response] });
  return normalized[0] ?? contract;
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
      console.info(
        `[ContractsContext] Contratos carregados via apiClient: ${normalized.length} itens recebidos.`
      );
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
    const draft = cloneContract(contract);
    try {
      const saved = await createContractInApi(draft);
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

        register(saved);
        prev.forEach(register);

        return next;
      });
      setError(null);
      return saved;
    } catch (apiError) {
      console.error('[ContractsProvider] Falha ao criar contrato na API.', apiError);
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
    (id: string) => contracts.find((contract) => contract.id === id),
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
