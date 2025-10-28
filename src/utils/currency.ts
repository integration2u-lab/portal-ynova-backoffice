const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrencyBRL(value: number): string {
  if (!Number.isFinite(value)) {
    return currencyFormatter.format(0);
  }
  return currencyFormatter.format(value);
}

export function parseCurrencyInput(value: string): number | null {
  if (!value) return null;
  const normalized = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sanitizeCurrencyInput(value: string): string {
  if (!value) return '';
  const cleaned = value
    .replace(/\s/g, '')
    .replace(/[^0-9,]/g, '')
    .replace(/,{2,}/g, ',');

  const [integerPartRaw = '', decimalPartRaw = ''] = cleaned.split(',');
  const integerDigits = integerPartRaw.replace(/\D/g, '');
  const normalizedInteger = integerDigits.replace(/^0+(?=\d)/, '') || (cleaned.includes(',') ? '0' : integerDigits);
  const decimals = decimalPartRaw.replace(/\D/g, '').slice(0, 2);

  if (cleaned.includes(',')) {
    return `${normalizedInteger || '0'},${decimals}`;
  }

  return normalizedInteger;
}

export function formatCurrencyInputBlur(value: string): string {
  const numeric = parseCurrencyInput(value);
  if (numeric === null) return '';
  return numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
