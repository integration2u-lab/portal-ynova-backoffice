import { monthsBetween } from './dateRange';
import type { ContractPriceMonth, ContractPricePeriod, ContractPricePeriods } from '../types/pricePeriods';

export type PricePeriodsSummary = {
  filledMonths: number;
  averagePrice: number | null;
};

const ensureRandomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const YEAR_MONTH_REGEX = /^(\d{4})-(0[1-9]|1[0-2])$/;

const normalizeYearMonth = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = trimmed.length >= 7 ? trimmed.slice(0, 7) : trimmed;
  return YEAR_MONTH_REGEX.test(candidate) ? candidate : null;
};

const diffInMonths = (start: string, end: string): number => {
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  if ([sy, sm, ey, em].some((value) => Number.isNaN(value))) {
    return Number.POSITIVE_INFINITY;
  }
  return (ey - sy) * 12 + (em - sm);
};

const isConsecutiveMonth = (prev: string, current: string): boolean => diffInMonths(prev, current) === 1;

const sanitizeMonths = (months: unknown[]): ContractPriceMonth[] => {
  const sanitized: ContractPriceMonth[] = [];
  months.forEach((month) => {
    if (!month || typeof month !== 'object') {
      return;
    }
    const record = month as { ym?: unknown; month?: unknown; price?: unknown; value?: unknown };
    const ym = normalizeYearMonth(record.ym ?? record.month);
    const price = coerceNumber(record.price ?? record.value);
    if (!ym || price === null || !Number.isFinite(price)) {
      return;
    }
    sanitized.push({ ym, price });
  });

  sanitized.sort((a, b) => (a.ym > b.ym ? 1 : a.ym < b.ym ? -1 : 0));
  return sanitized;
};

const buildPeriodsFromMonthMap = (value: Record<string, unknown>): ContractPricePeriods | null => {
  const monthEntries: ContractPriceMonth[] = [];

  Object.entries(value).forEach(([ym, price]) => {
    const normalizedYm = normalizeYearMonth(ym);
    const numericPrice = coerceNumber(price);
    if (!normalizedYm || numericPrice === null || !Number.isFinite(numericPrice)) {
      return;
    }
    monthEntries.push({ ym: normalizedYm, price: numericPrice });
  });

  monthEntries.sort((a, b) => (a.ym > b.ym ? 1 : a.ym < b.ym ? -1 : 0));

  if (!monthEntries.length) {
    return null;
  }

  const periods: ContractPricePeriod[] = [];
  let current: { start: string; end: string; months: ContractPriceMonth[] } | null = null;

  for (const month of monthEntries) {
    if (!current) {
      current = { start: month.ym, end: month.ym, months: [month] };
      continue;
    }

    if (isConsecutiveMonth(current.end, month.ym)) {
      current.end = month.ym;
      current.months.push(month);
      continue;
    }

    periods.push({
      id: ensureRandomId(),
      start: current.start,
      end: current.end,
      defaultPrice: null,
      months: current.months,
    });

    current = { start: month.ym, end: month.ym, months: [month] };
  }

  if (current) {
    periods.push({
      id: ensureRandomId(),
      start: current.start,
      end: current.end,
      defaultPrice: null,
      months: current.months,
    });
  }

  return { periods };
};

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

export function parseContractPricePeriods(value: unknown): ContractPricePeriods | null {
  if (!value) {
    return null;
  }

  let raw: unknown = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    try {
      raw = JSON.parse(trimmed);
    } catch (error) {
      console.warn('[contractPricing] parseContractPricePeriods - JSON.parse falhou', error);
      return null;
    }
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown> & { periods?: unknown };

  if (Array.isArray(record.periods)) {
    const periods: ContractPricePeriod[] = [];

    record.periods.forEach((period, index) => {
      if (!period || typeof period !== 'object') {
        return;
      }

      const data = period as {
        id?: unknown;
        start?: unknown;
        end?: unknown;
        defaultPrice?: unknown;
        months?: unknown;
      };

      const months = Array.isArray(data.months) ? sanitizeMonths(data.months) : [];
      const start = normalizeYearMonth(data.start) ?? months[0]?.ym ?? null;
      const end = normalizeYearMonth(data.end) ?? months[months.length - 1]?.ym ?? start;
      if (!start || !end) {
        return;
      }

      const defaultPrice = coerceNumber(data.defaultPrice);

      periods.push({
        id: typeof data.id === 'string' && data.id.trim() ? data.id : `${ensureRandomId()}-${index}`,
        start,
        end,
        defaultPrice: defaultPrice ?? null,
        months,
      });
    });

    if (!periods.length) {
      return { periods: [] };
    }

    return { periods };
  }

  const converted = buildPeriodsFromMonthMap(record);
  return converted ?? { periods: [] };
}
