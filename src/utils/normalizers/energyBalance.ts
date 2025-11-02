import type {
  EnergyBalanceDetail,
  EnergyBalanceDetailMonthRow,
  EnergyBalanceEvent,
  EnergyBalanceListItem,
} from '../../types/energyBalance';
import type { EmailRow } from '../../types/email';

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

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
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

const truthyBooleanStrings = [
  'sim',
  's',
  'true',
  '1',
  'yes',
  'y',
  'ok',
  'enviado',
  'enviada',
  'enviados',
  'sucesso',
  'success',
  'confirmado',
  'confirmed',
];

const falsyBooleanStrings = [
  'nao',
  'nao.',
  'n',
  'false',
  '0',
  'no',
  'pendente',
  'pendente.',
  'erro',
  'falha',
  'failed',
  'failure',
  'aguardando',
];

const toBooleanFlag = (value: unknown): boolean | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    const normalizedAscii = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (truthyBooleanStrings.includes(normalizedAscii) || truthyBooleanStrings.includes(normalized)) {
      return true;
    }
    if (falsyBooleanStrings.includes(normalizedAscii) || falsyBooleanStrings.includes(normalized)) {
      return false;
    }
  }
  return null;
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

const normalizeNumber = (value: unknown): string => {
  const numeric = toNumber(value);
  if (numeric === null) return 'Não informado';
  try {
    return numeric.toFixed(2);
  } catch (error) {
    console.warn('[energyBalance] falha ao formatar número', error);
    return numeric.toFixed(2);
  }
};

const normalizeProinfa = (value: unknown): string => {
  const numeric = toNumber(value);
  if (numeric === null) return 'Não informado';
  try {
    // Format with 3 decimal places to preserve precision like "0.219"
    return numeric.toFixed(3);
  } catch (error) {
    console.warn('[energyBalance] falha ao formatar PROINFA', error);
    return numeric.toFixed(3);
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

const normalizeDate = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return 'Não informado';
  const text = String(value).trim();
  if (!text) return 'Não informado';
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    try {
      return dateFormatter.format(parsed);
    } catch (error) {
      console.warn('[energyBalance] falha ao formatar data', error);
    }
  }
  return text;
};

const normalizeDateTime = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return 'Não informado';
  const text = String(value).trim();
  if (!text) return 'Não informado';
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    try {
      return dateTimeFormatter.format(parsed).replace('.', '');
    } catch (error) {
      console.warn('[energyBalance] falha ao formatar data/hora', error);
    }
  }
  return text;
};

const toTitleCase = (value: string): string => {
  if (!value) return value;
  return value.replace(/(^|\s)([\p{L}\p{M}])/gu, (match) => match.toUpperCase());
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

export function normalizeEnergyBalanceListItem(row: unknown): EnergyBalanceListItem {
  const record = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};

  const idSource =
    getSafe(record, 'id', 'balanceId', 'balance_id', 'uuid', 'energy_balance_id') ??
    getSafe(record, 'meta.id', 'metadata.id');
  const id = toStringSafe(idSource, fallbackId());

  const clientName =
    getSafe(record, 'clientName', 'client_name', 'cliente', 'client.nome', 'client.name', 'name') ??
    getSafe(record, 'customerName', 'clienteNome');
  const cliente = toStringSafe(clientName, 'Cliente não informado');

  const cnpjSource =
    getSafe(record, 'cnpj', 'clientCnpj', 'client_cnpj', 'cliente.cnpj', 'client.cnpj', 'document') ??
    getSafe(record, 'customer.document', 'metadata.cnpj');
  const cnpj = cnpjSource ? formatCnpj(String(cnpjSource)) : 'Não informado';

  const meterSource =
    getSafe(record, 'meter', 'meterCode', 'meter_code', 'uc', 'uc_code', 'medidor', 'codigoUc') ??
    getSafe(record, 'client.meter', 'metadata.meter');
  const meterCode = toStringSafe(meterSource, 'Não informado');

  const impostoPercent = normalizePercent(
    getSafe(record, 'tax', 'imposto', 'imposto_percent', 'impostoPercent', 'tax_percent', 'aliquota'),
  );

  const consumo = normalizeKwh(
    getSafe(
      record,
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
    getSafe(record, 'generation_kwh', 'geracao_kwh', 'generationKwh', 'geracao', 'generation', 'metrics.generation_kwh'),
  );

  const saldo = normalizeKwh(
    getSafe(record, 'saldo_kwh', 'saldoKwh', 'balance_kwh', 'balanceKwh', 'saldo', 'balance', 'net_balance'),
  );

  const saldoDisplay =
    saldo.numeric === null
      ? '-'
      : `${saldo.numeric >= 0 ? '+' : '-'} ${saldo.display}`;

  const referenceLabelRaw = normalizeMonthLabel(
    getSafe(record, 'referenceBase', 'reference_base', 'competencia', 'reference', 'mesReferencia'),
  );
  const referenceLabelSanitized = referenceLabelRaw.replace('Nǜo', 'Nao');
  const referenceBaseLabel =
    referenceLabelSanitized && referenceLabelSanitized !== 'Nao informado'
      ? referenceLabelSanitized
      : 'Sem referencia';

  const sentOkFlag = toBooleanFlag(
    getSafe(
      record,
      'sentOk',
      'sent_ok',
      'envioOk',
      'envio_ok',
      'sent',
      'statusEnvio',
      'envioStatus',
      'envio_status',
      'status_envio'
    ),
  );
  return {
    id,
    cliente,
    cnpj,
    meterCode,
    impostoPercent,
    consumoKWh: consumo.display,
    geracaoKWh: geracao.display,
    saldoKWh: saldoDisplay,
    sentOk: sentOkFlag,
    saldoValor: saldo.numeric,
    referenceBaseLabel,
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

export function normalizeEnergyBalanceDetail(row: unknown): EnergyBalanceDetail {
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

  // Calculate metrics from the single record data
  const consumptionKwh = toNumber(getSafe(record, 'consumptionKwh', 'consumption_kwh', 'consumo_kwh', 'consumo', 'metrics.consumption_kwh', 'metrics.consumptionKwh', 'summary.consumption_kwh'));
  const consumptionMwh = consumptionKwh !== null ? consumptionKwh / 1000 : null;
  const price = toNumber(getSafe(record, 'price', 'preco', 'tarifa'));
  const billable = toNumber(getSafe(record, 'billable', 'custo', 'cost', 'value'));
  const proinfaContribution = toNumber(getSafe(record, 'proinfaContribution', 'proinfa_contribution', 'proinfa'));

  const consumoTotalMWh = consumptionMwh !== null ? normalizeMwh(consumptionMwh) : '-';
  const custoTotalBRL = billable !== null ? normalizeCurrencyAllowZero(billable) : 'Não informado';
  const proinfaTotal = proinfaContribution !== null ? normalizeProinfa(proinfaContribution) : 'Não informado';
  
  // Calculate potential savings (simplified calculation)
  const currentCost = billable || (price && consumptionMwh ? price * consumptionMwh : 0);
  const expectedCost = price && consumptionMwh ? price * consumptionMwh : 0;
  const potentialSavings = Math.max(0, currentCost - expectedCost);
  const economiaPotencialBRL = potentialSavings > 0 ? normalizeCurrency(potentialSavings) : 'Não informado';

  // Create a single month entry from the record data
  const monthLabel = normalizeMonthLabel(
    getSafe(record, 'referenceBase', 'reference_base', 'competencia', 'month', 'mes')
  );

  const medidor = toStringSafe(
    getSafe(record, 'meter', 'medidor', 'meter_code', 'meterCode', 'uc', 'ucCode'),
    'Não informado',
  );

  console.log('[normalizeEnergyBalanceDetail] 🔍 Consumption (Consumo):', {
    rawKwh: consumptionKwh,
    convertedMwh: consumptionMwh,
    normalized: normalizeMwh(consumptionMwh)
  });
  const consumoMWh = normalizeMwh(consumptionMwh);
  const precoReaisPorMWh = price !== null ? normalizeCurrencyAllowZero(price) : 'Não informado';
  const custoMes = billable !== null ? normalizeCurrencyAllowZero(billable) : 'Não informado';
  const proinfa = proinfaContribution !== null ? normalizeProinfa(proinfaContribution) : 'Não informado';

  const minDemand = toNumber(getSafe(record, 'minDemand', 'min_demand', 'min'));
  const maxDemand = toNumber(getSafe(record, 'maxDemand', 'max_demand', 'max'));
  const faixaContratual = describeRange(minDemand, maxDemand);

  // Try to get reajusted_price first, if not available, fallback to boolean
  const reajustedPriceValue = toNumber(
    getSafe(
      record,
      'reajuted_price',
      'reajusted_price',
      'reajustedPrice',
      'reajutedPrice',
      'price_reajusted',
      'priceReajusted',
      'price_adjusted',
      'priceAdjusted',
      'adjusted_price',
      'adjustedPrice',
      'precoReajustado',
      'preco_reajustado',
    ),
  );
  
  const ajustado = reajustedPriceValue !== null
    ? normalizeCurrencyAllowZero(reajustedPriceValue)
    : normalizeBoolean(
        getSafe(record, 'adjusted', 'ajustado', 'isAdjusted', 'ajustado_bool', 'ajuste'),
      );

  const fornecedor = toStringSafe(
    getSafe(record, 'supplier', 'fornecedor', 'provider', 'company'),
    'Não informado'
  );

  const contrato = toStringSafe(
    getSafe(record, 'contract', 'contrato', 'contractCode', 'codigoContrato'),
    'Não informado'
  );

  const codigoCP = toStringSafe(
    getSafe(record, 'cpCode', 'cp_code', 'codigoCP', 'contaParticipacao'),
    'Não informado'
  );

  const dataCriacao = normalizeDateTime(
    getSafe(record, 'createdAt', 'created_at', 'dataCriacao', 'criadoEm')
  );

  const dataAtualizacao = normalizeDateTime(
    getSafe(record, 'updatedAt', 'updated_at', 'dataAtualizacao', 'atualizadoEm')
  );

  const contatoAtivo = normalizeBoolean(
    getSafe(record, 'contactActive', 'contact_active', 'contatoAtivo', 'ativo')
  );

  const statusMeasurementSource = getSafe(
    record,
    'statusMeasurement',
    'measurementStatus',
    'status_medicao',
    'statusMedicao',
    'measurement_status',
    'metrics.statusMeasurement',
    'metrics.status_medicao',
  );
  const statusMeasurementText = toStringSafe(statusMeasurementSource, '');
  const statusMeasurement = statusMeasurementText
    ? toTitleCase(statusMeasurementText)
    : null;

  // Campos adicionais necessários para edição
  const lossValue = toNumber(getSafe(record, 'loss', 'perdas', 'losses', 'perdas3'));
  console.log('[normalizeEnergyBalanceDetail] 🔍 Loss (Perdas):', {
    raw: lossValue,
    dividedBy1000: lossValue !== null ? lossValue / 1000 : null,
    normalized: lossValue !== null ? normalizeMwh(lossValue / 1000) : 'Não informado'
  });
  const perdas3 = lossValue !== null ? normalizeMwh(lossValue / 1000) : 'Não informado';

  const requirementValue = toNumber(getSafe(record, 'requirement', 'requisito', 'req'));
  console.log('[normalizeEnergyBalanceDetail] 🔍 Requirement (Requisito):', {
    raw: requirementValue,
    dividedBy1000: requirementValue !== null ? requirementValue / 1000 : null,
    normalized: requirementValue !== null ? normalizeMwh(requirementValue / 1000) : 'Não informado'
  });
  const requisito = requirementValue !== null ? normalizeMwh(requirementValue / 1000) : 'Não informado';

  const netValue = toNumber(getSafe(record, 'net', 'net_value', 'valorLiquido'));
  console.log('[normalizeEnergyBalanceDetail] 🔍 Net:', { raw: netValue, normalized: netValue !== null ? netValue.toFixed(2) : 'Não informado' });
  const net = netValue !== null ? netValue.toFixed(2) : 'Não informado';

  const medicao = toStringSafe(
    getSafe(record, 'statusMeasurement', 'status_measurement', 'medicao', 'measurement'),
    'Não informado',
  );

  const minimo = minDemand !== null ? normalizeMwh(minDemand) : 'Não informado';
  const maximo = maxDemand !== null ? normalizeMwh(maxDemand) : 'Não informado';
  console.log('[normalizeEnergyBalanceDetail] 🔍 Demanda:', {
    minRaw: minDemand,
    maxRaw: maxDemand,
    minNormalized: minimo,
    maxNormalized: maximo
  });

  const billableValue = toNumber(getSafe(record, 'billable', 'faturar', 'bill'));
  console.log('[normalizeEnergyBalanceDetail] 🔍 Billable (Faturar):', {
    raw: billableValue,
    dividedBy1000: billableValue !== null ? billableValue / 1000 : null,
    normalized: billableValue !== null ? normalizeMwh(billableValue / 1000) : 'Não informado'
  });
  const faturar = billableValue !== null ? normalizeMwh(billableValue / 1000) : 'Não informado';

  const emailRaw = getSafe(record, 'email', 'emails', 'destinatario', 'recipient');
  const email = emailRaw ? String(emailRaw) : 'Não informado';

  const sentOkRaw = getSafe(record, 'sentOk', 'sent_ok', 'envioOk', 'envio_ok');
  const envioOk = sentOkRaw === true ? 'Sim' : sentOkRaw === false ? 'Não' : 'Não informado';

  const disparoRaw = getSafe(record, 'sendDate', 'send_date', 'disparo', 'sentAt');
  const disparo = disparoRaw ? normalizeDateTime(disparoRaw) : 'Não disparado';

  const dataVencimentoRaw = getSafe(record, 'billsDate', 'bills_date', 'dataVencimento', 'vencimento', 'due_date');
  const dataVencimentoBoleto = dataVencimentoRaw ? normalizeDate(dataVencimentoRaw) : 'Não informado';

  const months: EnergyBalanceDetailMonthRow[] = [{
    id: toStringSafe(getSafe(record, 'id', 'uuid'), '1'),
    mes: monthLabel,
    medidor,
    consumoMWh,
    precoReaisPorMWh,
    custoMesBRL: custoMes,
    proinfa,
    faixaContratual,
    ajustado,
    fornecedor,
    contrato,
    codigoCP,
    dataCriacao,
    dataAtualizacao,
    contatoAtivo,
    actions: '-',
    // Campos adicionais para os cards editáveis
    perdas3,
    requisito,
    net,
    medicao,
    minimo,
    maximo,
    faturar,
    email,
    envioOk,
    disparo,
    dataVencimentoBoleto,
  }];

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
    cliente: razao,
    statusMeasurement,
  };
}

export function normalizeEnergyBalanceEvent(
  event: unknown,
  index = 0,
): EnergyBalanceEvent {
  const record = event && typeof event === 'object' ? (event as Record<string, unknown>) : {};
  const eventId = toStringSafe(
    getSafe(record, 'id', 'eventId', 'uuid', 'logId'),
    `event-${index}`,
  );
  const message = toStringSafe(
    getSafe(record, 'message', 'descricao', 'description', 'detail', 'event'),
    'Atualização registrada',
  );
  const type = toStringSafe(getSafe(record, 'type', 'categoria', 'category'), '');
  const user = toStringSafe(
    getSafe(record, 'user', 'usuario', 'actor', 'author', 'created_by'),
    'Sistema',
  );
  const createdAt = normalizeDateTime(
    getSafe(record, 'created_at', 'createdAt', 'data', 'timestamp', 'created_at_utc'),
  );
  const titleParts = [type ? toTitleCase(type) : '', message].filter(Boolean);

  return {
    id: eventId,
    title: titleParts.length ? titleParts.join(' · ') : message,
    description: message,
    user,
    createdAt,
  };
}

export function normalizeEmailRow(row: unknown, index = 0): EmailRow {
  const record = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};

  const id = toStringSafe(
    getSafe(record, 'id', 'emailId', 'uuid', 'rowId', 'energy_balance_id', 'balanceId'),
    `email-${index}`,
  );

  const clientes = toStringSafe(
    getSafe(
      record,
      'clientes',
      'cliente',
      'clienteNome',
      'client_name',
      'clientName',
      'name',
      'razaoSocial',
      'client.legalName',
    ),
    'Não informado',
  );

  const preco = normalizeCurrencyAllowZero(
    getSafe(record, 'preco', 'price', 'valor', 'tarifa', 'price_mwh', 'pricePerMwh'),
  );

  const dataBase = normalizeMonthLabel(
    getSafe(
      record,
      'referenceBase',
      'dataBase',
      'data_base',
      'competencia',
      'reference',
      'reference_base',
      'mesReferencia',
    ),
  );

  // Try to get reajusted_price first, if not available, fallback to boolean
  const reajustedPriceValue = toNumber(
    getSafe(
      record,
      'reajuted_price',
      'reajusted_price',
      'reajustedPrice',
      'reajutedPrice',
      'price_reajusted',
      'priceReajusted',
      'price_adjusted',
      'priceAdjusted',
      'adjusted_price',
      'adjustedPrice',
      'precoReajustado',
      'preco_reajustado',
    ),
  );
  
  const reajustado = reajustedPriceValue !== null
    ? normalizeCurrencyAllowZero(reajustedPriceValue)
    : normalizeBoolean(
        getSafe(record, 'reajustado', 'ajustado', 'isAdjusted', 'ajuste'),
      );

  const fornecedor = toStringSafe(
    getSafe(record, 'fornecedor', 'supplier', 'provider', 'company', 'fornecedor_nome'),
    'Não informado',
  );

  const medidor = toStringSafe(
    getSafe(record, 'medidor', 'meter', 'meter_code', 'meterCode', 'uc', 'ucCode', 'codigoUc'),
    'Não informado',
  );

  console.log('[normalizeEmailRow] 🔍 Dados brutos recebidos do backend:', {
    id: record.id,
    consumptionKwh: record.consumptionKwh,
    loss: record.loss,
    requirement: record.requirement,
    net: record.net,
    statusMeasurement: record.statusMeasurement,
    minDemand: record.minDemand,
    maxDemand: record.maxDemand,
    billable: record.billable,
    email: record.email,
    sentOk: record.sentOk,
    sent_ok: record.sent_ok,
    sendDate: record.sendDate,
    send_date: record.send_date,
    billsDate: record.billsDate,
    bills_date: record.bills_date,
  });

  // Consumo (MWh) - buscar de consumptionKwh e converter para MWh
  const consumptionKwhValue = toNumber(getSafe(record, 'consumptionKwh', 'consumption_kwh', 'consumo_kwh', 'consumo'));
  const consumo = consumptionKwhValue !== null ? normalizeMwh(consumptionKwhValue / 1000) : 'Não informado';
  console.log('[normalizeEmailRow] Consumo:', { raw: consumptionKwhValue, normalized: consumo });

  // Perdas (3%) - buscar de loss
  const lossValue = toNumber(getSafe(record, 'loss', 'perdas', 'losses', 'perdas3'));
  const perdas3 = lossValue !== null ? normalizeMwh(lossValue / 1000) : 'Não informado';
  console.log('[normalizeEmailRow] Perdas:', { raw: lossValue, normalized: perdas3 });

  // Requisito - buscar de requirement
  const requirementValue = toNumber(getSafe(record, 'requirement', 'requisito', 'req'));
  const requisito = requirementValue !== null ? normalizeMwh(requirementValue / 1000) : 'Não informado';
  console.log('[normalizeEmailRow] Requisito:', { raw: requirementValue, normalized: requisito });

  // NET - buscar de net (número completo, sem R$)
  const netValue = toNumber(getSafe(record, 'net', 'net_value', 'valorLiquido'));
  const net = netValue !== null ? netValue.toFixed(2) : 'Não informado';
  console.log('[normalizeEmailRow] NET:', { raw: netValue, normalized: net });

  // Medição - buscar de statusMeasurement
  const medicao = toStringSafe(
    getSafe(record, 'statusMeasurement', 'status_measurement', 'medicao', 'measurement'),
    'Não informado',
  );
  console.log('[normalizeEmailRow] Medição:', medicao);

  const proinfa = normalizeProinfa(
    getSafe(record, 'proinfa', 'proinfaContribution', 'proinfa_contribution', 'proinfa_total'),
  );

  const contrato = toStringSafe(
    getSafe(record, 'contrato', 'contract', 'contractCode', 'codigoContrato', 'contract_code'),
    'Não informado',
  );

  // Mínimo (MWh) - buscar de min_demand
  const minDemandValue = toNumber(getSafe(record, 'minDemand', 'min_demand', 'minimo', 'min'));
  const minimo = minDemandValue !== null ? normalizeMwh(minDemandValue) : 'Não informado';
  console.log('[normalizeEmailRow] Mínimo:', { raw: minDemandValue, normalized: minimo });

  // Máximo (MWh) - buscar de max_demand
  const maxDemandValue = toNumber(getSafe(record, 'maxDemand', 'max_demand', 'maximo', 'max'));
  const maximo = maxDemandValue !== null ? normalizeMwh(maxDemandValue) : 'Não informado';
  console.log('[normalizeEmailRow] Máximo:', { raw: maxDemandValue, normalized: maximo });

  // Faturar - buscar de billable
  const billableValue = toNumber(getSafe(record, 'billable', 'faturar', 'bill'));
  const faturar = billableValue !== null ? normalizeMwh(billableValue / 1000) : 'Não informado';
  console.log('[normalizeEmailRow] Faturar:', { raw: billableValue, normalized: faturar });

  const cp = toStringSafe(
    getSafe(record, 'cpCode', 'cp', 'cp_code', 'conta_participacao'),
    'Não informado',
  );

  // Email - buscar de email (pode ter múltiplos)
  const emailRaw = getSafe(record, 'email', 'emails', 'destinatario', 'recipient');
  const email = emailRaw ? String(emailRaw) : 'Não informado';
  console.log('[normalizeEmailRow] Email:', email);

  // Envio OK - buscar de sent_ok (true/false)
  const sentOkRaw = getSafe(record, 'sentOk', 'sent_ok', 'envioOk', 'envio_ok');
  const envioOk = sentOkRaw === true ? 'Sim' : sentOkRaw === false ? 'Não' : 'Não informado';
  console.log('[normalizeEmailRow] Envio OK:', { raw: sentOkRaw, normalized: envioOk });

  // Data Disparo - buscar de send_date
  const disparoRaw = getSafe(record, 'sendDate', 'send_date', 'disparo', 'sentAt');
  const disparo = disparoRaw ? normalizeDateTime(disparoRaw) : 'Não disparado';
  console.log('[normalizeEmailRow] Data Disparo:', { raw: disparoRaw, normalized: disparo });

  // Data Vencimento da NF - buscar de bills_date
  const dataVencimentoRaw = getSafe(record, 'billsDate', 'bills_date', 'dataVencimento', 'vencimento', 'due_date');
  const dataVencimentoBoleto = dataVencimentoRaw ? normalizeDate(dataVencimentoRaw) : 'Não informado';
  console.log('[normalizeEmailRow] Data Vencimento NF:', { raw: dataVencimentoRaw, normalized: dataVencimentoBoleto });

  return {
    id,
    clientes,
    preco,
    dataBase,
    reajustado,
    fornecedor,
    medidor,
    consumo,
    perdas3,
    requisito,
    net,
    medicao,
    proinfa,
    contrato,
    minimo,
    maximo,
    faturar,
    cp,
    email,
    envioOk,
    disparo,
    dataVencimentoBoleto,
  };
}
