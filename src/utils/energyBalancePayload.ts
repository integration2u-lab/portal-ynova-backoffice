import type { EmailRow } from '../types/email';

const isEmptyValue = (value: string | null | undefined): boolean => {
  if (value === null || value === undefined) return true;
  const trimmed = value.trim();
  return trimmed === '' || trimmed === '-' || trimmed === 'Não informado';
};

const parseNumber = (value: string): number | null => {
  if (isEmptyValue(value)) return null;
  const cleaned = value.replace(/[R$\s\.]/g, '').replace(',', '.');
  const num = Number.parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
};

const parseMwh = (value: string): number | null => {
  if (isEmptyValue(value)) return null;
  const cleaned = value.replace(/MWh\s*/gi, '').trim();
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const num = Number.parseFloat(normalized);
  return Number.isNaN(num) ? null : num;
};

const parsePercent = (value: string): number | null => {
  if (isEmptyValue(value)) return null;
  const cleaned = value.replace(/%\s*/g, '').trim();
  const normalized = cleaned.replace(',', '.');
  const num = Number.parseFloat(normalized);
  return Number.isNaN(num) ? null : num / 100;
};

const parseBoolean = (value: string): boolean | null => {
  if (isEmptyValue(value)) return null;
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

  if (['sim', 'true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }
  if (['nao', 'não', 'nao.', 'nao ', 'não.', 'nao ', 'n', 'false', '0', 'no'].includes(normalized)) {
    return false;
  }
  return null;
};

const parseDate = (value: string, isDateTime = false): string | null => {
  if (isEmptyValue(value)) return null;

  if (value.includes('/')) {
    const [datePart, timePartRaw] = value.split(' ');
    if (datePart.includes('/')) {
      const [day, month, year] = datePart.split('/');
      const timePart = timePartRaw ? (timePartRaw.length === 5 ? `${timePartRaw}:00` : timePartRaw) : '00:00:00';
      if (isDateTime) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}.000Z`;
      }
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`;
    }
  }

  if (value.includes('T')) {
    if (!value.includes('Z') && !value.includes('+') && !value.includes('--')) {
      const cleaned = value.replace(/\.\d{3}Z?$/, '');
      return `${cleaned}.000Z`;
    }
    return value;
  }

  return value;
};

const ensureOriginalField = (
  payload: Record<string, unknown>,
  originalRawData: Record<string, unknown> | undefined,
  key: string,
) => {
  if (!originalRawData) return;
  if (Object.prototype.hasOwnProperty.call(originalRawData, key) && payload[key] === undefined) {
    payload[key] = originalRawData[key];
  }
};

export type DisplayEnergyBalanceRow = Pick<EmailRow,
  | 'id'
  | 'clientes'
  | 'preco'
  | 'dataBase'
  | 'reajustado'
  | 'fornecedor'
  | 'medidor'
  | 'consumo'
  | 'perdas3'
  | 'requisito'
  | 'net'
  | 'medicao'
  | 'proinfa'
  | 'contrato'
  | 'minimo'
  | 'maximo'
  | 'faturar'
  | 'cp'
  | 'email'
  | 'envioOk'
  | 'disparo'
  | 'dataVencimentoBoleto'
>;

export function convertDisplayRowToEnergyBalancePayload(
  row: DisplayEnergyBalanceRow,
  originalRawData?: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  payload.meter = !isEmptyValue(row.medidor) ? row.medidor : null;
  payload.clientName = !isEmptyValue(row.clientes) ? row.clientes : null;

  if (originalRawData?.referenceBase !== undefined) {
    payload.referenceBase = originalRawData.referenceBase;
  }

  payload.price = parseNumber(row.preco ?? '');
  payload.supplier = !isEmptyValue(row.fornecedor) ? row.fornecedor : null;
  payload.email = !isEmptyValue(row.email) ? row.email : null;

  const consumptionMwh = parseMwh(row.consumo ?? '');
  payload.consumptionKwh = consumptionMwh !== null ? (consumptionMwh * 1000).toFixed(8) : null;

  payload.loss = parsePercent(row.perdas3 ?? '');

  const requirementNumber = parseNumber(row.requisito ?? '');
  payload.requirement = requirementNumber !== null ? String(requirementNumber) : null;
  payload.net = parseNumber(row.net ?? '');
  payload.proinfaContribution = parseNumber(row.proinfa ?? '');
  payload.contract = !isEmptyValue(row.contrato) ? row.contrato : null;
  payload.minDemand = parseMwh(row.minimo ?? '');
  payload.maxDemand = parseMwh(row.maximo ?? '');
  payload.billable = parseNumber(row.faturar ?? '');
  payload.cpCode = !isEmptyValue(row.cp) ? row.cp : null;

  const adjustedValue = parseBoolean(row.reajustado ?? '');
  const adjustedPrice = parseNumber(row.reajustado ?? '');
  const sentOkValue = parseBoolean(row.envioOk ?? '');

  if (adjustedPrice !== null && adjustedValue === null) {
    payload.adjusted = null;
    payload.reajustedPrice = adjustedPrice;
    payload.reajutedPrice = adjustedPrice;
    payload.reajusted_price = adjustedPrice;
    payload.reajuted_price = adjustedPrice;
  } else {
    payload.adjusted = adjustedValue;
    payload.reajustedPrice = adjustedPrice;
    payload.reajutedPrice = adjustedPrice;
    payload.reajusted_price = adjustedPrice;
    payload.reajuted_price = adjustedPrice;
  }

  payload.sentOk = sentOkValue;

  payload.billsDate = parseDate(row.dataVencimentoBoleto ?? '', true);

  if (originalRawData) {
    ['clientId', 'contractId', 'contactActive', 'createdAt', 'updatedAt', 'priceType'].forEach((key) => {
      ensureOriginalField(payload, originalRawData, key);
    });
  }

  return payload;
}

export const sanitizeDisplayValue = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return '';
  if (value === 'Não informado' || value === '-') return '';
  return value;
};
