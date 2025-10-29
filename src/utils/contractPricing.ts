import { monthsBetween } from './dateRange';
import type { ContractPricePeriod, ContractPricePeriods } from '../types/pricePeriods';

export type PricePeriodsSummary = {
  filledMonths: number;
  averagePrice: number | null;
};

const ensureRandomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function summarizePricePeriods(value: ContractPricePeriods | undefined | null): PricePeriodsSummary {
  if (!value || !Array.isArray(value.periods)) {
    return { filledMonths: 0, averagePrice: null };
  }

  const monthMap = new Map<string, number>();
  value.periods.forEach((period) => {
    period.months.forEach(({ ym, price }) => {
      if (ym && price !== null && Number.isFinite(price)) {
        monthMap.set(ym, price);
      }
    });
  });

  const prices = Array.from(monthMap.values());
  if (!prices.length) {
    return { filledMonths: 0, averagePrice: null };
  }

  const sum = prices.reduce((acc, price) => acc + price, 0);
  return {
    filledMonths: prices.length,
    averagePrice: sum / prices.length,
  };
}

const sanitizeYear = (value: number | null | undefined, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1900 && value <= 9999) {
    return value;
  }
  return fallback;
};

const coerceNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export function createAnnualPeriod(year: number, defaultPrice?: number | null): ContractPricePeriod {
  const sanitizedYear = sanitizeYear(year, new Date().getFullYear());
  const start = `${sanitizedYear}-01`;
  const end = `${sanitizedYear}-12`;
  const months = monthsBetween(start, end).map((ym) => ({ ym, price: null }));
  return {
    id: ensureRandomId(),
    start,
    end,
    defaultPrice: defaultPrice ?? null,
    months,
  };
}

export function ensureAnnualPeriod(period: ContractPricePeriod): ContractPricePeriod {
  const year = Number.parseInt(period.start.slice(0, 4), 10);
  const sanitizedYear = sanitizeYear(Number.isNaN(year) ? null : year, new Date().getFullYear());
  const start = `${sanitizedYear}-01`;
  const end = `${sanitizedYear}-12`;
  const monthValues = new Map(period.months.map((month) => [month.ym, month.price] as const));
  const months = monthsBetween(start, end).map((ym) => ({
    ym,
    price: monthValues.has(ym) ? monthValues.get(ym) ?? null : null,
  }));

  return {
    id: period.id || ensureRandomId(),
    start,
    end,
    defaultPrice: coerceNumber(period.defaultPrice),
    months,
  };
}

export function normalizeAnnualPricePeriods(value: ContractPricePeriods | undefined | null): ContractPricePeriods {
  if (!value || !Array.isArray(value.periods)) {
    return { periods: [] };
  }

  const normalized = value.periods.map((period) => {
    const base: ContractPricePeriod = {
      id: period.id || ensureRandomId(),
      start: period.start || period.end || `${new Date().getFullYear()}-01`,
      end: period.end || period.start || `${new Date().getFullYear()}-12`,
      defaultPrice: coerceNumber(period.defaultPrice),
      months: Array.isArray(period.months)
        ? period.months.map((month) => ({
            ym: month.ym,
            price: coerceNumber(month.price),
          }))
        : [],
    };

    return ensureAnnualPeriod(base);
  });

  return { periods: normalized };
}

export function inferNextAnnualYear(value: ContractPricePeriods | undefined | null, fallback: number): number {
  if (!value || !value.periods.length) {
    return fallback;
  }
  const years = value.periods
    .map((period) => Number.parseInt(period.start.slice(0, 4), 10))
    .filter((year) => Number.isFinite(year));
  if (!years.length) {
    return fallback;
  }
  return Math.max(...years) + 1;
}

export function calculateAdjustedPriceDifference(
  pricePeriods: ContractPricePeriods | undefined | null,
  referencePrice: number
): number {
  const summary = summarizePricePeriods(pricePeriods);
  if (!summary.filledMonths || summary.averagePrice === null) {
    return 0;
  }
  return summary.averagePrice - referencePrice;
}

export function clonePricePeriods(value: ContractPricePeriods | undefined | null): ContractPricePeriods {
  if (!value) {
    return { periods: [] };
  }
  return {
    periods: value.periods.map((period) => ({
      id: period.id,
      start: period.start,
      end: period.end,
      defaultPrice: period.defaultPrice ?? null,
      months: period.months.map((month) => ({ ym: month.ym, price: month.price ?? null })),
    })),
  };
}
