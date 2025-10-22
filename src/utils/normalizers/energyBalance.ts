export type NormalizedEnergyBalanceListItem = {
  id: string;
  cliente: string;
  cnpj: string;
  meterCode: string;
  impostoPercent: string;
  consumoKWh: string;
  geracaoKWh: string;
  saldoKWh: string;
  saldoValor?: number | null;
};

export type NormalizedEnergyBalanceDetail = {
  header: {
    titleSuffix: string;
    razao: string;
    cnpj: string;
    contractId?: string;
    contractCode?: string;
  };
  metrics: {
    consumoTotalMWh: string;
    custoTotalBRL: string;
    proinfaTotal: string;
    economiaPotencialBRL: string;
  };
  months: Array<{
    id: string;
    mes: string;
    medidor: string;
    consumoMWh: string;
    precoReaisPorMWh: string;
    custoMesBRL: string;
    proinfa: string;
    faixaContratual: string;
    ajustado: string;
    actions?: string;
  }>;
};

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const kwhFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

const mwhFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: 'numeric',
});

const textFormatter = new Intl.ListFormat('pt-BR', { style: 'short', type: 'conjunction' });

const sanitizeNumberString = (value: string) => {
  // Handle formats like 1.234,56 or 1,234.56
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const commaCount = (trimmed.match(/,/g) || []).length;
  const dotCount = (trimmed.match(/\./g) || []).length;
  if (commaCount <= 1 && dotCount > 1 && trimmed.includes(',')) {
    const lastComma = trimmed.lastIndexOf(',');
    const normalized = `${trimmed.slice(0, lastComma).replace(/\./g, '')}${trimmed.slice(lastComma).replace(',', '.')}`;
    return normalized;
  }

  if (commaCount > 1 && !trimmed.includes('.')) {
    const parts = trimmed.split(',');
    const decimals = parts.pop();
    return `${parts.join('')}.${decimals}`;
  }

  return trimmed.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  const text = sanitizeNumberString(String(value));
  if (!text) return null;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : null;
};

const toStringSafe = (value: unknown, fallback = ''): string => {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const fallbackId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `balance-${Date.now()}-${Math.round(Math.random() * 10_000)}`;
};

const normalizePercent = (value: unknown): string => {
  const numeric = toNumber(value);
  if (numeric === null) return '-';
  const normalized = Math.abs(numeric) <= 1 ? numeric : numeric / 100;
  try {
    return percentFormatter.format(normalized);
  } catch (error) {
    console.warn('[energyBalance] falha ao formatar percentual', error);
    return `${(normalized * 100).toFixed(2)}%`;
  }
};

const normalizeKwh = (value: unknown): { display: string; numeric: number | null } => {
  const numeric = toNumber(value);
  if (numeric === null) {
    return { display: '-', numeric: null };
  }
  try {
    return { display: `${kwhFormatter.format(Math.abs(numeric))} kWh`, numeric };
  } catch (error) {
    console.warn('[energyBalance] falha ao formatar kWh', error);
    return { display: `${Math.abs(numeric).toFixed(0)} kWh`, numeric };
  }
};

const normalizeMwh = (value: unknown): string => {
  const numeric = toNumber(value);
  if (numeric === null) return '-';
  try {
    return `${mwhFormatter.format(numeric)} MWh`;
  } catch (error) {
    console.warn('[energyBalance] falha ao formatar MWh', error);
    return `${numeric.toFixed(2)} MWh`;
  }
};

const normalizeCurrency = (value: unknown): string => {
  const numeric = toNumber(value);
  if (numeric === null) return 'Não informado';
  try {
    return currencyFormatter.format(numeric);
  } catch (error) {
    console.warn('[energyBalance] falha ao formatar moeda', error);
    return `R$ ${numeric.toFixed(2)}`;
  }
};

const normalizeCurrencyAllowZero = (value: unknown): string => {
  const numeric = toNumber(value);
  if (numeric === null) return 'Não informado';
  try {
    return currencyFormatter.format(numeric);
  } catch (error) {
    console.warn('[energyBalance] falha ao formatar moeda', error);
    return `R$ ${numeric.toFixed(2)}`;
  }
};

const normalizeBoolean = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return 'Não informado';
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (['sim', 's', 'true', '1', 'yes'].includes(text)) return 'Sim';
    if (['nao', 'não', 'n', 'false', '0', 'no'].includes(text)) return 'Não';
  }
  if (typeof value === 'number') {
    return value > 0 ? 'Sim' : 'Não';
  }
  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }
  return 'Não informado';
};

const normalizeMonthLabel = (value: unknown): string => {
  const text = toStringSafe(value);
  if (!text) return 'Não informado';
  if (/^\d{4}-\d{2}$/.test(text)) {
    const [year, month] = text.split('-').map((part) => Number(part));
    if (Number.isInteger(year) && Number.isInteger(month)) {
      try {
        return monthFormatter.format(new Date(year, month - 1, 1)).replace('.', '');
      } catch (error) {
        console.warn('[energyBalance] falha ao formatar mês', error);
      }
    }
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    try {
      return monthFormatter.format(parsed).replace('.', '');
    } catch (error) {
      console.warn('[energyBalance] falha ao formatar mês', error);
    }
  }
  return text;
};

const formatCnpj = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14) return value || 'Não informado';
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

export function getSafe(record: unknown, ...keys: Array<string | string[]>): unknown {
  if (!record || typeof record !== 'object') return undefined;
  const flatKeys = keys.flat();
  for (const key of flatKeys) {
    if (!key) continue;
    const path = key.split('.');
    let current: unknown = record;
    let matched = true;
    for (const segment of path) {
      if (
        current &&
        typeof current === 'object' &&
        segment in (current as Record<string, unknown>)
      ) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        matched = false;
        break;
      }
    }
    if (matched && current !== undefined && current !== null) {
      return current;
    }
  }
  return undefined;
}

export function normalizeListItem(row: any): NormalizedEnergyBalanceListItem {
  const idSource =
    getSafe(row, 'id', 'balanceId', 'balance_id', 'uuid', 'energy_balance_id') ??
    getSafe(row, 'meta.id', 'metadata.id');
  const id = toStringSafe(idSource, fallbackId());

  const clientName =
    getSafe(row, 'clientName', 'client_name', 'cliente', 'client.nome', 'client.name', 'name') ??
    getSafe(row, 'customerName', 'clienteNome');
  const cliente = toStringSafe(clientName, 'Cliente não informado');

  const cnpjSource =
    getSafe(row, 'cnpj', 'clientCnpj', 'client_cnpj', 'cliente.cnpj', 'client.cnpj', 'document') ??
    getSafe(row, 'customer.document', 'metadata.cnpj');
  const cnpj = cnpjSource ? formatCnpj(String(cnpjSource)) : 'Não informado';

  const meterSource =
    getSafe(row, 'meter', 'meterCode', 'meter_code', 'uc', 'uc_code', 'medidor', 'codigoUc') ??
    getSafe(row, 'client.meter', 'metadata.meter');
  const meterCode = toStringSafe(meterSource, 'Não informado');

  const impostoPercent = normalizePercent(
    getSafe(row, 'tax', 'imposto', 'imposto_percent', 'impostoPercent', 'tax_percent', 'aliquota'),
  );

  const consumo = normalizeKwh(
    getSafe(
      row,
      'consumption_kwh',
      'consumo_kwh',
      'consumptionKwh',
      'consumoKwh',
      'consumption',
      'consumo',
      'metrics.consumption_kwh',
    ),
  );

  const geracao = normalizeKwh(
    getSafe(row, 'generation_kwh', 'geracao_kwh', 'generationKwh', 'geracao', 'generation', 'metrics.generation_kwh'),
  );

  const saldo = normalizeKwh(
    getSafe(row, 'saldo_kwh', 'saldoKwh', 'balance_kwh', 'balanceKwh', 'saldo', 'balance', 'net_balance'),
  );

  const saldoDisplay = saldo.numeric === null
    ? '-'
    : `${saldo.numeric >= 0 ? '+' : '-'}${kwhFormatter.format(Math.abs(saldo.numeric))} kWh`;

  return {
    id,
    cliente,
    cnpj,
    meterCode,
    impostoPercent,
    consumoKWh: consumo.display,
    geracaoKWh: geracao.display,
    saldoKWh: saldoDisplay,
    saldoValor: saldo.numeric,
  };
}

const extractMetrics = (row: Record<string, unknown> | undefined) => {
  if (!row) return {};
  if ('metrics' in row && row.metrics && typeof row.metrics === 'object') {
    return row.metrics as Record<string, unknown>;
  }
  if ('summary' in row && row.summary && typeof row.summary === 'object') {
    return row.summary as Record<string, unknown>;
  }
  return row;
};

const describeRange = (minValue: unknown, maxValue: unknown): string => {
  const min = toNumber(minValue);
  const max = toNumber(maxValue);
  if (min === null && max === null) return 'Não informado';
  const values: string[] = [];
  if (min !== null) {
    try {
      values.push(`${mwhFormatter.format(min)} MWh`);
    } catch (error) {
      console.warn('[energyBalance] falha ao formatar faixa mínima', error);
      values.push(`${min.toFixed(2)} MWh`);
    }
  }
  if (max !== null) {
    try {
      values.push(`${mwhFormatter.format(max)} MWh`);
    } catch (error) {
      console.warn('[energyBalance] falha ao formatar faixa máxima', error);
      values.push(`${max.toFixed(2)} MWh`);
    }
  }
  if (!values.length) return 'Não informado';
  if (values.length === 1) return values[0];
  try {
    return textFormatter.format(values as [string, string]);
  } catch {
    return `${values[0]} – ${values[1]}`;
  }
};

export function normalizeDetail(row: any): NormalizedEnergyBalanceDetail {
  const record = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};

  const contractId = getSafe(record, 'contractId', 'contract_id', 'contract.id', 'contratoId');
  const contractCode = getSafe(record, 'contractCode', 'contract_code', 'contract.codigo', 'codigo');

  const headerTitle =
    getSafe(record, 'code', 'codigo', 'reference', 'referenceCode', 'reference_code') ??
    getSafe(record, 'year', 'ano', 'referenceYear') ??
    getSafe(record, 'referenceBase', 'reference_base', 'competencia');

  const titleSuffixRaw = toStringSafe(headerTitle);
  const titleSuffix = titleSuffixRaw
    ? normalizeMonthLabel(headerTitle)
    : contractCode
      ? toStringSafe(contractCode)
      : '-';

  const razao = toStringSafe(
    getSafe(
      record,
      'razao_social',
      'razaoSocial',
      'client.legalName',
      'client.razao_social',
      'client.razaoSocial',
      'cliente.razaoSocial',
      'clientName',
      'client_name',
      'cliente',
    ),
    'Não informado',
  );

  const cnpjValue =
    getSafe(record, 'cnpj', 'clientCnpj', 'client_cnpj', 'client.cnpj', 'cliente.cnpj') ??
    getSafe(record, 'document', 'cliente.documento');
  const cnpj = cnpjValue ? formatCnpj(String(cnpjValue)) : 'Não informado';

  const metricsSource = extractMetrics(record);

  const consumoTotalMWh = normalizeMwh(
    getSafe(
      metricsSource,
      'total_consumption_mwh',
      'totalConsumptionMwh',
      'consumo_total_mwh',
      'consumptionTotalMwh',
      'consumption_mwh',
      'consumptionTotal',
    ),
  );

  const custoTotalBRL = normalizeCurrencyAllowZero(
    getSafe(
      metricsSource,
      'total_cost',
      'totalCost',
      'custo_total',
      'costTotal',
      'custo',
      'totalValue',
    ),
  );

  const proinfaTotal = normalizeCurrencyAllowZero(
    getSafe(metricsSource, 'total_proinfa', 'proinfaTotal', 'proinfa_total', 'proinfa'),
  );

  const economiaPotencialBRL = normalizeCurrency(
    getSafe(
      metricsSource,
      'potential_savings',
      'economiaPotencial',
      'economia_potencial',
      'potentialSavings',
    ),
  );

  const monthsSource =
    getSafe(
      record,
      'months',
      'monthly',
      'entries',
      'dados',
      'data',
      'rows',
      'items',
      'detalhes',
      'monthsData',
      'result',
    ) ?? [];

  const monthsArray = Array.isArray(monthsSource)
    ? monthsSource
    : Array.isArray((monthsSource as Record<string, unknown>)?.items)
      ? ((monthsSource as Record<string, unknown>).items as unknown[])
      : [];

  const months = monthsArray.map((item, index) => {
    const entry = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const entryId = toStringSafe(
      getSafe(entry, 'id', 'uuid', 'rowId', 'monthId'),
      `${index}`,
    );
    const monthLabel = normalizeMonthLabel(
      getSafe(entry, 'month', 'mes', 'period', 'reference', 'referencia', 'reference_base', 'referenceBase'),
    );

    const medidor = toStringSafe(
      getSafe(entry, 'meter', 'medidor', 'meter_code', 'meterCode', 'uc', 'ucCode'),
      'Não informado',
    );

    const consumoMWh = normalizeMwh(
      getSafe(entry, 'consumption_mwh', 'consumptionMwh', 'consumo_mwh', 'consumo', 'consumption'),
    );
    const precoReaisPorMWh = normalizeCurrencyAllowZero(
      getSafe(entry, 'price', 'preco', 'price_mwh', 'preco_mwh', 'tarifa', 'pricePerMwh'),
    );
    const custoMes = normalizeCurrencyAllowZero(
      getSafe(entry, 'monthCost', 'custo_mes', 'custo', 'cost', 'billable', 'value'),
    );
    const proinfa = normalizeCurrencyAllowZero(
      getSafe(entry, 'proinfa', 'proinfa_total', 'proinfaContribution', 'encargoProinfa'),
    );

    const faixaContratual = describeRange(
      getSafe(entry, 'contractRangeMin', 'faixa_min', 'min', 'lowerLimit', 'limite_inferior', 'min_mwh'),
      getSafe(entry, 'contractRangeMax', 'faixa_max', 'max', 'upperLimit', 'limite_superior', 'max_mwh'),
    );

    const ajustado = normalizeBoolean(
      getSafe(entry, 'adjusted', 'ajustado', 'isAdjusted', 'ajustado_bool', 'ajuste'),
    );

    return {
      id: entryId,
      mes: monthLabel,
      medidor,
      consumoMWh,
      precoReaisPorMWh,
      custoMesBRL: custoMes,
      proinfa,
      faixaContratual,
      ajustado,
      actions: '-',
    };
  });

  return {
    header: {
      titleSuffix: titleSuffix || '-',
      razao,
      cnpj,
      contractId: contractId ? String(contractId) : undefined,
      contractCode: contractCode ? String(contractCode) : undefined,
    },
    metrics: {
      consumoTotalMWh,
      custoTotalBRL,
      proinfaTotal,
      economiaPotencialBRL,
    },
    months,
  };
}
