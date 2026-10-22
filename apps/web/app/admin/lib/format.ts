export const TIMEZONE = 'Africa/Dar_es_Salaam';

export const CURRENCIES = ['USD', 'TZS', 'EUR', 'GBP', 'JPY', 'KWD'] as const;

/** Minor-unit exponents, mirroring the platform's booking policy rules. */
export const CURRENCY_EXPONENTS: Record<string, number> = {
  USD: 2,
  TZS: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  KWD: 3,
};

export function exponentOf(currency: string): number {
  return CURRENCY_EXPONENTS[currency.toUpperCase()] ?? 2;
}

/** Money arrives as an integer minor-unit decimal string. */
export function moneyValue(minor: unknown, currency: string): number {
  const raw = typeof minor === 'bigint' ? minor.toString() : String(minor ?? '0');
  const parsed = Number(raw.replace(/[^\d-]/g, '')) || 0;
  return parsed / 10 ** exponentOf(currency);
}

export interface MoneyOptions {
  /** Drop the decimals when the amount is whole (nicer for KPI cards). */
  compact?: boolean;
  /** Always show the currency symbol/prefix. */
  withCurrency?: boolean;
}

export function formatMoney(minor: unknown, currency = 'USD', options: MoneyOptions = {}): string {
  const value = moneyValue(minor, currency);
  const exponent = exponentOf(currency);
  const isWhole = Math.abs(value % 1) < Number.EPSILON;
  if (options.compact && Math.abs(value) >= 100_000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
      style: 'currency',
      currency,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: options.compact && isWhole ? 0 : exponent,
    maximumFractionDigits: exponent,
  }).format(value);
}

export function formatNumber(value: unknown): string {
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '0').replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(numeric)) return '0';
  return new Intl.NumberFormat('en-US').format(numeric);
}

export function formatCompactNumber(value: unknown): string {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return '0';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(numeric);
}

/** Turn a user-entered decimal string into the API's minor-unit integer string. */
export function toMinor(amount: string | number, currency: string): string {
  const numeric = typeof amount === 'number' ? amount : Number(String(amount).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(numeric)) return '0';
  return String(Math.round(numeric * 10 ** exponentOf(currency)));
}

/** Minor units back to a plain decimal string suitable for a form input. */
export function fromMinor(minor: unknown, currency: string): string {
  return moneyValue(minor, currency).toString();
}

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: unknown, always = false): string {
  const date = parseDate(value);
  if (!date) return always ? '—' : '';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: TIMEZONE,
  }).format(date);
}

export function formatDateTime(value: unknown, always = false): string {
  const date = parseDate(value);
  if (!date) return always ? '—' : '';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  }).format(date);
}

export function formatRelative(value: unknown): string {
  const date = parseDate(value);
  if (!date) return '';
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
    ['second', 1],
  ];
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size || unit === 'second') {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }
  return '';
}

/** `grossCaptured` → `Gross captured`; `EN_ROUTE_TO_PICKUP` → `En route to pickup`. */
export function labelize(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const spaced = text
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export function titleCase(value: unknown): string {
  return labelize(value)
    .split(' ')
    .map((word) => (word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function initials(name: unknown): string {
  const parts = String(name ?? '')
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}

export type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'default';

const TONE_GROUPS: Record<Exclude<Tone, 'default'>, string[]> = {
  success: [
    'CONFIRMED',
    'ACTIVE',
    'PUBLISHED',
    'SUCCEEDED',
    'SETTLED',
    'COMPLETED',
    'AVAILABLE',
    'APPROVED',
    'VERIFIED',
    'RESOLVED',
    'PAID',
    'CAPTURED',
    'HEALTHY',
    'READY',
    'OK',
    'GRANTED',
    'ONLINE',
  ],
  warning: [
    'PENDING',
    'REQUESTED',
    'DRAFT',
    'IN_REVIEW',
    'PROCESSING',
    'ON_REQUEST',
    'QUEUED',
    'NEW',
    'UNVERIFIED',
    'OPEN',
    'MAINTENANCE',
    'ACKNOWLEDGED',
    'COMING_SOON',
    'SUPERSEDED',
    'PARTIAL',
    'LOW',
    'MEDIUM',
  ],
  danger: [
    'CANCELLED',
    'FAILED',
    'REJECTED',
    'EXPIRED',
    'SUSPENDED',
    'HIDDEN',
    'RETIRED',
    'DECLINED',
    'CRITICAL',
    'HIGH',
    'ARCHIVED',
    'DEACTIVATED',
    'BLOCKED',
    'ERROR',
    'MISSING',
  ],
  accent: [
    'EN_ROUTE_TO_PICKUP',
    'PICKED_UP',
    'SAFARI_STARTED',
    'ACTIVITY_REACHED',
    'RETURNING',
    'IN_PROGRESS',
    'LIVE',
    'ADMIN',
    'OPERATIONS',
    'DRIVER_GUIDE',
    'CUSTOMER',
  ],
};

export function statusTone(status: unknown): Tone {
  const key = String(status ?? '').trim().toUpperCase();
  if (!key) return 'default';
  for (const [tone, values] of Object.entries(TONE_GROUPS) as Array<[Exclude<Tone, 'default'>, string[]]>) {
    if (values.includes(key)) return tone;
  }
  return 'default';
}

/** Percentage change helper for KPI deltas. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function truncate(value: unknown, length = 90): string {
  const text = String(value ?? '');
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
}

export function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}
