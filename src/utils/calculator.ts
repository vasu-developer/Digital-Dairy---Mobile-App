import { calculateFatSnfRate, RateChartConfig, DEFAULT_CUSTOMER_RATE_CONFIG } from './rate-chart';

/**
 * Calculates milk rate per litre based on Fat % and SNF % using configured pricing rules.
 */
export function calculateMilkRate(
  fat?: number,
  snf?: number,
  config: RateChartConfig = DEFAULT_CUSTOMER_RATE_CONFIG
): number {
  return calculateFatSnfRate(fat, snf, config);
}

/**
 * Calculates total amount = Quantity * Rate
 */
export function calculateTotalAmount(quantity?: number, rate?: number): number {
  const q = typeof quantity === 'number' && !isNaN(quantity) ? quantity : 0;
  const r = typeof rate === 'number' && !isNaN(rate) ? rate : 0;
  if (q <= 0 || r <= 0) return 0;
  return Math.round(q * r * 100) / 100;
}

/**
 * Format currency string in Indian Rupees (₹)
 * Safe against undefined, null, NaN
 */
export function formatCurrency(amount?: number | null): string {
  const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  try {
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  } catch (e) {
    return '₹' + val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

/**
 * Sanitizes numeric input with optional decimal point.
 * Strips all characters except digits (0-9) and at most one decimal point.
 */
export function sanitizeDecimalInput(text: string): string {
  let cleaned = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned;
}

/**
 * Sanitizes integer input (digits 0-9 only).
 * Strips all non-digit characters.
 */
export function sanitizeIntegerInput(text: string): string {
  return text.replace(/[^0-9]/g, '');
}

