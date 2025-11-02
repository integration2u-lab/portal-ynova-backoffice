import type { EmailRow } from '../types/email';

const isEmptyValue = (value: string | null | undefined): boolean => {
  if (value === null || value === undefined) return true;
  const trimmed = value.trim();
  return trimmed === '' || trimmed === '-' || trimmed === 'Não informado';
};

const parseNumber = (value: string): number | null => {
  if (isEmptyValue(value)) return null;
  // Tratar formato brasileiro: "6.112,39" -> remove pontos de milhares, substitui vírgula por ponto
  // Primeiro, verificar se há vírgula (indicando formato brasileiro com vírgula decimal)
  let cleaned = value.trim().replace(/[R$\s]/g, '');
  if (cleaned.includes(',')) {
    // Formato brasileiro: vírgula é decimal, pontos são milhares
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Formato padrão: apenas remover pontos que podem ser separadores de milhares
    // Mas manter o ponto se houver apenas um (decimal padrão)
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      // Múltiplos pontos = separadores de milhares, remover todos
      cleaned = cleaned.replace(/\./g, '');
    }
  }
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

  // consumptionKwh não deve ser editado no backend - removido do payload
  // const consumptionMwh = parseMwh(row.consumo ?? '');
  // payload.consumptionKwh = consumptionMwh !== null ? (consumptionMwh * 1000).toFixed(8) : null;

  // loss não é porcentagem, é um valor decimal direto (MWh ou kWh)
  // Usar parseNumber ao invés de parsePercent
  const lossNumber = parseNumber(row.perdas3 ?? '');
  payload.loss = lossNumber !== null ? lossNumber : null;
  
  console.log('[convertDisplayRowToEnergyBalancePayload] 🔍 Loss (Perdas):', {
    input: row.perdas3,
    parsed: lossNumber,
    final: payload.loss,
  });

  const requirementNumber = parseNumber(row.requisito ?? '');
  payload.requirement = requirementNumber !== null ? requirementNumber : null;
  
  console.log('[convertDisplayRowToEnergyBalancePayload] 🔍 Requirement (Requisito):', {
    input: row.requisito,
    parsed: requirementNumber,
    final: payload.requirement,
  });
  
  const netNumber = parseNumber(row.net ?? '');
  payload.net = netNumber !== null ? netNumber : null;
  
  console.log('[convertDisplayRowToEnergyBalancePayload] 🔍 NET:', {
    input: row.net,
    parsed: netNumber,
    final: payload.net,
  });
  
  // Converter PROINFA preservando zero à esquerda e formato decimal
  const proinfaValue = row.proinfa ?? '';
  if (!isEmptyValue(proinfaValue)) {
    // Normalizar: remover espaços e símbolos, substituir vírgula por ponto
    const cleaned = proinfaValue.trim().replace(/[R$\s]/g, '').replace(',', '.');
    const numValue = parseFloat(cleaned);
    
    console.log('[convertDisplayRowToEnergyBalancePayload] 🔍 Processando PROINFA:', {
      originalInput: proinfaValue,
      cleaned,
      numValue,
    });
    
    if (!isNaN(numValue) && isFinite(numValue)) {
      // Preservar casas decimais do input original
      const decimalPlaces = cleaned.includes('.') ? (cleaned.split('.')[1]?.length || 0) : 0;
      // Converter para string preservando casas decimais (sem remover zero à esquerda)
      const formatted = decimalPlaces > 0 ? numValue.toFixed(decimalPlaces) : numValue.toString();
      
      console.log('[convertDisplayRowToEnergyBalancePayload] ✅ PROINFA convertido:', {
        decimalPlaces,
        formatted,
        finalValue: formatted,
      });
      
      payload.proinfaContribution = formatted;
    } else {
      console.log('[convertDisplayRowToEnergyBalancePayload] ⚠️ PROINFA não é um número válido');
      payload.proinfaContribution = null;
    }
  } else {
    payload.proinfaContribution = null;
  }
  
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
