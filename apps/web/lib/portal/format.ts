import type { Money } from './api';

const EXPONENTS: Record<string, number> = { USD: 2, TZS: 2, EUR: 2, GBP: 2, JPY: 0, KWD: 3 };

export function money(minor: Money | null | undefined, currency = 'USD'): string {
  if (minor === null || minor === undefined || minor === '') return '—';
  const exponent = EXPONENTS[currency] ?? 2;
  const value = Number(minor) / 10 ** exponent;
  if (!Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency,
      maximumFractionDigits: exponent,
      minimumFractionDigits: exponent,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(exponent)}`;
  }
}

export function dateLabel(value?: string | null): string {
  if (!value) return 'Dates to be confirmed';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Dates to be confirmed';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Dar_es_Salaam',
  }).format(date);
}

export function dateTimeLabel(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Dar_es_Salaam',
  }).format(date);
}

export function dateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return 'Dates to be confirmed';
  if (start && end) return `${dateLabel(start)} → ${dateLabel(end)}`;
  return dateLabel(start ?? end);
}

export function daysUntil(value?: string | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'With the desk',
  QUOTED: 'Proposal ready',
  REVISION_REQUESTED: 'Changes requested',
  ACCEPTED: 'Accepted',
  CLOSED: 'Closed',
  DRAFT: 'Draft',
  SENT: 'Awaiting your decision',
  SUPERSEDED: 'Replaced by a newer version',
  REJECTED: 'Declined',
  EXPIRED: 'Expired',
  REQUESTED: 'Awaiting confirmation',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  UNPAID: 'Unpaid',
  PARTIALLY_PAID: 'Deposit received',
  PAID: 'Paid in full',
  REFUND_DUE: 'Refund due',
  PENDING: 'Processing',
  PROCESSING: 'Processing',
  UNKNOWN: 'Verifying',
  CAPTURED: 'Payment received',
  SUCCEEDED: 'Payment received',
  FAILED: 'Payment failed',
  READY: 'Ready',
  GENERATING: 'Preparing',
};

export function statusLabel(value?: string | null): string {
  if (!value) return 'Unknown';
  return STATUS_LABELS[value] ?? value.replaceAll('_', ' ').toLowerCase().replace(/^./, (char) => char.toUpperCase());
}

export type Tone = 'positive' | 'warning' | 'neutral' | 'negative' | 'info';

export function statusTone(value?: string | null): Tone {
  switch (value) {
    case 'ACCEPTED':
    case 'CONFIRMED':
    case 'COMPLETED':
    case 'PAID':
    case 'CAPTURED':
    case 'SUCCEEDED':
    case 'READY':
      return 'positive';
    case 'QUOTED':
    case 'SENT':
    case 'PARTIALLY_PAID':
    case 'PENDING':
    case 'PROCESSING':
    case 'UNKNOWN':
    case 'IN_REVIEW':
    case 'GENERATING':
      return 'warning';
    case 'REJECTED':
    case 'CANCELLED':
    case 'FAILED':
    case 'EXPIRED':
    case 'REFUND_DUE':
      return 'negative';
    case 'SUBMITTED':
    case 'REQUESTED':
      return 'info';
    default:
      return 'neutral';
  }
}

export function initials(name?: string | null): string {
  if (!name) return 'MA';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
