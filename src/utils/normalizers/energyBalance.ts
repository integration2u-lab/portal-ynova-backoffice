import { EnergyBalanceUtils } from '../../services/energyBalance';
import type {
  EnergyBalanceDetail,
  EnergyBalanceListItem,
} from '../../services/energyBalanceApi';

export type NormalizedEnergyBalanceListItem = {
  id: string;
  cliente: string;
  impostoPercent: string;
  consumoKWh: string;
  geracaoKWh: string;
  saldoKWh: string;
  saldoValue?: number;
  cnpj?: string;
  cnpjDigits?: string;
  meterCode?: string;
  searchIndex: string;
  raw: EnergyBalanceListItem;
};

export type NormalizedEnergyBalanceDetail = {
  header: {
    titleSuffix: string;
    razao: string;
    cnpj: string;
    contractId?: string;
  };
  metrics: {
    consumoTotalMWh: string;
    custoTotalBRL: string;
    proinfaTotal: string;
    economiaPotencialBRL: string;
  };
  months: Array<{
    mes: string;
    medidor: string;
    consumoMWh: string;
    precoR$/MWh: string;
    custoMesBRL: string;
    proinfa: string;
    faixaContratual: string;
    ajustado: string;
    actions?: string;
  }>;
  canCreateBalance?: boolean;
  raw: EnergyBalanceDetail;
};

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

const ensureId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const sanitizeString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return undefined;
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const sanitized = trimmed
      .replace(/%/g, '')
      .replace(/\s+/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return 'Não informado';
  }
  const normalized = Math.abs(value) <= 1 && value !== 0 ? value * 100 : value;
  return `${percentFormatter.format(normalized)}%`;
};

const formatKwh = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return 'Não informado';
  }
  return `${numberFormatter.format(value)} kWh`;
};

const formatMwhValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return 'Não informado';
  }
  return EnergyBalanceUtils.formatMwh(value);
};

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return 'Não informado';
  }
  return currencyFormatter.format(value);
};

const boolToDisplay = (value: unknown): string => {
  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['sim', 'yes', 'true', 'ajustado', 'ajustada'].includes(normalized)) {
      return 'Sim';
    }
    if (['não', 'nao', 'no', 'false', 'nao ajustado'].includes(normalized)) {
      return 'Não';
    }
  }
  return '-';
};

const formatMonth = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      return EnergyBalanceUtils.formatMonthReference(trimmed);
    }
    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) {
      return date
        .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        .replace('.', '');
    }
    if (trimmed.length) {
      return trimmed;
    }
  }
  return 'Não informado';
};

export function getSafe<T = unknown>(record: unknown, ...keys: Array<string | string[]>): T | undefined {
  if (!record || typeof record !== 'object') {
    return undefined;
  }

  for (const key of keys) {
    if (Array.isArray(key)) {
      let current: any = record;
      let found = true;
      for (const segment of key) {
        if (current && typeof current === 'object' && segment in current) {
          current = (current as Record<string, unknown>)[segment];
        } else {
          found = false;
          break;
        }
      }
      if (found && current !== undefined && current !== null && current !== '') {
        return current as T;
      }
    } else if (key in (record as Record<string, unknown>)) {
      const value = (record as Record<string, unknown>)[key];
      if (value !== undefined && value !== null && value !== '') {
        return value as T;
      }
    }
  }

  return undefined;
}

export function normalizeListItem(row: EnergyBalanceListItem): NormalizedEnergyBalanceListItem {
  const id =
    sanitizeString(getSafe(row, 'id', 'balanceId', 'balance_id', 'uuid', ['energy_balance', 'id'])) || ensureId();
  const cliente =
    sanitizeString(
      getSafe(row, 'client_name', 'clientName', 'cliente', 'razao_social', 'razaoSocial', ['client', 'name']),
    ) || 'Cliente não informado';

  const impostoPercentValue =
    parseNumber(getSafe(row, 'tax_percent', 'taxPercent', 'imposto_percent', 'aliquota', ['taxes', 'percent'])) ?? null;
  const consumoValueKwh =
    parseNumber(
      getSafe(
        row,
        'consumption_kwh',
        'consumo_kwh',
        'consumptionKwh',
        'consumption',
        ['totals', 'consumption_kwh'],
      ),
    );
  const consumoValueMwh =
    parseNumber(
      getSafe(row, 'consumption_mwh', 'consumo_mwh', 'consumptionMwh', ['totals', 'consumption_mwh']),
    );
  const geracaoValue =
    parseNumber(
      getSafe(row, 'generation_kwh', 'geracao_kwh', 'generationKwh', 'geracao', ['generation', 'kwh']),
    );
  const saldoValue =
    parseNumber(
      getSafe(row, 'balance_kwh', 'saldo_kwh', 'net_kwh', 'saldo', 'balance', ['totals', 'balance_kwh']),
    );

  const cnpj =
    sanitizeString(getSafe(row, 'cnpj', 'client_cnpj', 'cnpjNumber', ['client', 'cnpj'], ['company', 'cnpj'])) || undefined;
  const cnpjDigits = cnpj ? cnpj.replace(/\D/g, '') : undefined;
  const meterCode =
    sanitizeString(getSafe(row, 'meter_code', 'meterCode', 'medidor', 'meter', ['meter', 'code'])) || undefined;

  const consumoFormatted =
    consumoValueMwh !== null && consumoValueMwh !== undefined
      ? (() => {
          const formatted = formatMwhValue(consumoValueMwh);
          return formatted === 'Não informado' ? formatted : `${formatted} MWh`;
        })()
      : formatKwh(consumoValueKwh);
  const geracaoFormatted = formatKwh(geracaoValue);

  const saldoFormatted = (() => {
    if (saldoValue === null || saldoValue === undefined) {
      return 'Não informado';
    }
    const abs = Math.abs(saldoValue);
    const formatted = numberFormatter.format(abs);
    const prefix = saldoValue > 0 ? '+' : saldoValue < 0 ? '-' : '';
    return `${prefix}${formatted}`;
  })();

  const searchIndex = [
    cliente.toLowerCase(),
    cnpjDigits ?? '',
    meterCode?.toLowerCase() ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const saldoDisplay = saldoFormatted === 'Não informado' ? saldoFormatted : `${saldoFormatted} kWh`;

  return {
    id,
    cliente,
    impostoPercent: formatPercent(impostoPercentValue),
    consumoKWh: consumoFormatted,
    geracaoKWh: geracaoFormatted,
    saldoKWh: saldoDisplay,
    saldoValue: saldoValue ?? undefined,
    cnpj,
    cnpjDigits,
    meterCode,
    searchIndex,
    raw: row,
  };
}

const normalizeMetric = (
  value: unknown,
  options: { type: 'mwh' | 'currency' } = { type: 'mwh' },
): string => {
  const numeric = parseNumber(value);
  if (numeric === null) {
    return 'Não informado';
  }
  if (options.type === 'currency') {
    return formatCurrency(numeric);
  }
  const formatted = formatMwhValue(numeric);
  return formatted === 'Não informado' ? formatted : `${formatted} MWh`;
};

const extractContractId = (row: EnergyBalanceDetail): string | undefined => {
  return sanitizeString(
    getSafe(row, 'contractId', 'contract_id', ['contract', 'id'], ['contract', 'contract_id'], ['metadata', 'contractId']),
  );
};

const extractCanCreate = (row: EnergyBalanceDetail): boolean | undefined => {
  const value = getSafe(row, 'canCreate', 'canCreateBalance', 'allowGenerate', ['permissions', 'canCreateBalance']);
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['sim', 'yes', 'true', '1'].includes(normalized)) return true;
    if (['não', 'nao', 'no', 'false', '0'].includes(normalized)) return false;
  }
  return undefined;
};

const toArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (value && typeof value === 'object') {
    const values = Object.values(value);
    if (values.every((item) => typeof item === 'object')) {
      return values as T[];
    }
  }
  return [];
};

export function normalizeDetail(row: EnergyBalanceDetail): NormalizedEnergyBalanceDetail {
  const titleCode =
    sanitizeString(
      getSafe(row, 'code', 'balanceCode', 'codigo', 'identifier', 'id', ['metadata', 'code']),
    ) || 'Não informado';
  const titleYear =
    sanitizeString(getSafe(row, 'year', 'referenceYear', 'ano_referencia', ['metadata', 'year']));
  const titleSuffix = titleYear && titleCode ? `${titleCode}/${titleYear}` : titleCode;

  const razao =
    sanitizeString(
      getSafe(row, 'client_name', 'clientName', 'cliente', 'razao_social', 'razaoSocial', ['client', 'name']),
    ) || 'Não informado';
  const cnpj =
    sanitizeString(getSafe(row, 'cnpj', 'client_cnpj', ['client', 'cnpj'], ['company', 'cnpj'])) || 'Não informado';

  const metricsSource = getSafe(row, 'metrics', 'totals', 'summary', ['data', 'metrics']) as Record<string, unknown> | undefined;

  const metrics = {
    consumoTotalMWh: normalizeMetric(
      metricsSource?.consumo_total_mwh ??
        metricsSource?.total_consumption_mwh ??
        metricsSource?.consumption_total_mwh ??
        getSafe(row, 'total_consumption_mwh', 'consumo_total_mwh', ['totals', 'consumption_mwh']),
    ),
    custoTotalBRL: normalizeMetric(
      metricsSource?.custo_total ??
        metricsSource?.total_cost ??
        metricsSource?.custo ??
        getSafe(row, 'total_cost', 'custo_total', ['totals', 'cost']),
      { type: 'currency' },
    ),
    proinfaTotal: normalizeMetric(
      metricsSource?.proinfa_total ??
        metricsSource?.total_proinfa ??
        getSafe(row, 'total_proinfa', 'proinfa_total', ['totals', 'proinfa']),
      { type: 'currency' },
    ),
    economiaPotencialBRL: normalizeMetric(
      metricsSource?.economia_potencial ??
        metricsSource?.potential_savings ??
        getSafe(row, 'potential_savings', 'economia_potencial', ['totals', 'potential_savings']),
      { type: 'currency' },
    ),
  };

  const monthsSource =
    getSafe(row, 'months', 'items', 'entries', ['data', 'months'], ['timeline', 'months']) ?? [];
  const monthsArray = toArray<Record<string, unknown>>(monthsSource);

  const months = monthsArray.map((month, index) => {
    const consumptionMwh =
      parseNumber(
        getSafe(month, 'consumption_mwh', 'consumo_mwh', 'consumptionMwh', ['totals', 'consumption_mwh']),
      ) ??
      (() => {
        const kwh = parseNumber(getSafe(month, 'consumption_kwh', 'consumo_kwh', 'consumptionKwh'));
        return kwh !== null ? kwh / 1000 : null;
      })();

    const priceValue = parseNumber(
      getSafe(month, 'price', 'price_mwh', 'preco', 'preco_mwh', ['values', 'price']),
    );

    const costValue = parseNumber(getSafe(month, 'cost', 'billable', 'custo', 'custo_mes', ['values', 'cost']));
    const proinfaValue = parseNumber(
      getSafe(month, 'proinfa', 'proinfa_value', 'proinfa_total', ['values', 'proinfa']),
    );
    const faixaMin = parseNumber(getSafe(month, 'min_demand', 'faixa_min', 'contract_min', ['range', 'min']));
    const faixaMax = parseNumber(getSafe(month, 'max_demand', 'faixa_max', 'contract_max', ['range', 'max']));

    let faixaContratual = 'Não informado';
    if (faixaMin !== null && faixaMax !== null) {
      const minDisplay = EnergyBalanceUtils.formatMwh(faixaMin);
      const maxDisplay = EnergyBalanceUtils.formatMwh(faixaMax);
      faixaContratual = `${minDisplay} – ${maxDisplay} MWh`;
    }

    const consumptionDisplay = (() => {
      const formatted = formatMwhValue(consumptionMwh);
      return formatted === 'Não informado' ? formatted : `${formatted} MWh`;
    })();

    return {
      mes:
        formatMonth(
          getSafe(
            month,
            'month',
            'mes',
            'competence',
            'reference',
            'reference_month',
            ['period', 'month'],
          ) ?? index,
        ),
      medidor:
        sanitizeString(getSafe(month, 'meter', 'medidor', 'meter_code', 'meterCode', ['meter', 'code'])) || 'Não informado',
      consumoMWh: consumptionDisplay,
      precoR$/MWh: formatCurrency(priceValue),
      custoMesBRL: formatCurrency(costValue),
      proinfa: formatCurrency(proinfaValue),
      faixaContratual,
      ajustado: boolToDisplay(getSafe(month, 'adjusted', 'ajustado', 'is_adjusted', ['flags', 'adjusted'])),
      actions: sanitizeString(getSafe(month, 'actionLabel', 'actions', 'acao')),
    };
  });

  return {
    header: {
      titleSuffix: titleSuffix || 'Não informado',
      razao,
      cnpj,
      contractId: extractContractId(row),
    },
    metrics,
    months,
    canCreateBalance: extractCanCreate(row),
    raw: row,
  };
}
