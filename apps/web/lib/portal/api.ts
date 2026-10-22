/**
 * Customer portal API client.
 *
 * The marketing site is a static export, so the portal authenticates directly
 * against the public API with bearer tokens kept in localStorage. Tokens are
 * namespaced separately from the staff console so both can live side by side.
 */

export type Role = 'CUSTOMER' | 'OPERATIONS' | 'DRIVER_GUIDE' | 'ADMIN';

export interface PortalUser {
  id: string;
  email: string;
  name: string;
  locale: 'en' | 'sw';
  status: string;
  version: number;
  emailVerified: boolean;
  roles: Role[];
  permissions: string[];
  customerId?: string;
  phone?: string | null;
  preferences?: Record<string, unknown>;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: PortalUser;
}

export class PortalApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Record<string, unknown> = {},
    public requestId?: string,
  ) {
    super(message);
    this.name = 'PortalApiError';
  }
}

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:4010/v1'
).replace(/\/$/, '');

const ROLE_CONTEXT: Role = 'CUSTOMER';
const ACCESS_KEY = 'ma.safaris.portal.access';
const REFRESH_KEY = 'ma.safaris.portal.refresh';

interface TokenListener {
  (tokens: { accessToken: string | null; refreshToken: string | null }): void;
}
const listeners = new Set<TokenListener>();

function emit() {
  const next = { accessToken: readAccess(), refreshToken: readRefresh() };
  for (const listener of listeners) listener(next);
}

export function onTokenChange(listener: TokenListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readAccess(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function readRefresh(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function storeTokens(tokens: { accessToken: string; refreshToken: string }) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  emit();
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  emit();
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  skipRefresh?: boolean;
  signal?: AbortSignal;
  anonymous?: boolean;
  idempotencyKey?: string;
}

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function rawFetch(path: string, options: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (!options.anonymous) {
    const token = readAccess();
    if (token) headers.Authorization = `Bearer ${token}`;
    headers['X-Role-Context'] = ROLE_CONTEXT;
  }
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
  return fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    cache: 'no-store',
  });
}

let refreshInFlight: Promise<Tokens> | null = null;

export async function refreshSession(): Promise<Tokens> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = readRefresh();
    if (!refreshToken) throw new PortalApiError(401, 'SESSION_REVOKED', 'No stored session.');
    const response = await rawFetch('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      anonymous: true,
      skipRefresh: true,
    });
    const payload = (await response.json().catch(() => null)) as
      | { data?: Tokens; error?: { code: string; message: string; requestId?: string } }
      | null;
    if (!response.ok || !payload?.data) {
      clearTokens();
      throw new PortalApiError(
        response.status,
        payload?.error?.code ?? 'SESSION_REVOKED',
        payload?.error?.message ?? 'Your session has expired. Sign in again.',
        {},
        payload?.error?.requestId,
      );
    }
    storeTokens(payload.data);
    return payload.data;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export interface Envelope<T> {
  data: T;
  meta: { requestId: string; limit?: number; hasMore?: boolean; nextCursor?: string | null };
}

export async function portalRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const mutating = options.method && options.method !== 'GET';
  const idempotencyKey = options.idempotencyKey ?? (mutating ? newIdempotencyKey() : undefined);
  const attempt = (key?: string) => rawFetch(path, { ...options, idempotencyKey: options.idempotencyKey ?? key });

  let response = await attempt(idempotencyKey);

  if (response.status === 401 && !options.skipRefresh && !options.anonymous) {
    try {
      await refreshSession();
    } catch {
      clearTokens();
      throw new PortalApiError(401, 'SESSION_REVOKED', 'Your session has expired. Sign in again.');
    }
    response = await attempt(idempotencyKey);
  }

  const text = await response.text();
  const payload = text
    ? (JSON.parse(text) as {
        data?: T;
        meta?: Envelope<T>['meta'];
        error?: { code: string; message: string; details?: Record<string, unknown>; requestId?: string };
      })
    : {};

  if (!response.ok) {
    const error = payload.error;
    throw new PortalApiError(
      response.status,
      error?.code ?? 'REQUEST_FAILED',
      error?.message ?? 'The request could not be completed.',
      error?.details ?? {},
      error?.requestId,
    );
  }

  if (payload.data === undefined) {
    throw new PortalApiError(response.status, 'EMPTY_RESPONSE', 'The server returned no data.');
  }
  return payload.data;
}

export async function login(email: string, password: string): Promise<Tokens> {
  const result = await portalRequest<Tokens>('/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password, deviceLabel: 'Customer portal · web' },
    anonymous: true,
    skipRefresh: true,
  });
  storeTokens(result);
  return result;
}

export async function logout(): Promise<void> {
  try {
    await portalRequest('/auth/logout', { method: 'POST' });
  } catch {
    /* the local session is what matters */
  } finally {
    clearTokens();
  }
}

export async function fetchMe(): Promise<PortalUser> {
  return portalRequest<PortalUser>('/me');
}

/** Downloads a private document (receipt, itinerary) with the portal session attached. */
export async function downloadDocument(id: string): Promise<{ blob: Blob; filename: string }> {
  const request = () => rawFetch(`/documents/${encodeURIComponent(id)}/download`);
  let response = await request();

  // The download path bypasses portalRequest(), so refresh an expired access
  // token explicitly instead of surfacing a misleading "document unavailable".
  if (response.status === 401) {
    try {
      await refreshSession();
    } catch {
      clearTokens();
      throw new PortalApiError(401, 'SESSION_REVOKED', 'Your session has expired. Sign in again.');
    }
    response = await request();
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { code?: string; message?: string } }
      | null;
    throw new PortalApiError(
      response.status,
      payload?.error?.code ?? 'DOCUMENT_UNAVAILABLE',
      payload?.error?.message ?? 'This document is not ready yet.',
    );
  }
  const disposition = response.headers.get('content-disposition') ?? '';
  const match = /filename="?([^";]+)"?/.exec(disposition);
  return { blob: await response.blob(), filename: match?.[1] ?? 'M-A-Safaris-document.pdf' };
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Safari may abort the download if the object URL is revoked synchronously.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* --------------------------------------------------------------- domain -- */

export type Money = string;

export interface RequestQuoteSummary {
  id: string;
  state: string;
  status?: string;
  version: number;
  versionNumber: number;
  totalMinor: Money;
  currency: string;
  expiresAt: string;
}

export interface RequestSummary {
  id: string;
  status: string;
  version: number;
  startDate: string | null;
  endDate: string | null;
  adults: number;
  children: number;
  currency: string;
  budgetMinor: Money | null;
  destinations: string[];
  service?: { id: string; title: string; slug?: string } | null;
  quotes: RequestQuoteSummary[];
  createdAt: string;
}

export interface QuoteLine {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unitAmountMinor: Money;
  totalMinor: Money;
}

export interface ItineraryActivity {
  title?: string;
  customerText?: string;
  description?: string;
  location?: { label?: string };
}

export interface ItineraryDay {
  day: number;
  title: string;
  description?: string;
  accommodation?: string;
  activities?: ItineraryActivity[];
}

export interface ItineraryContent {
  days?: ItineraryDay[];
  inclusions?: string[];
  exclusions?: string[];
}

export interface Quote extends RequestQuoteSummary {
  requestId: string;
  depositMinor: Money;
  sentAt: string | null;
  acceptedAt?: string | null;
  lines: QuoteLine[];
  itinerary?: { content?: ItineraryContent } | ItineraryContent | null;
  priceSnapshot?: { startDate?: string; endDate?: string };
  policySnapshot?: {
    id?: string;
    summary?: string;
    depositBasisPoints?: number;
    balanceDaysBefore?: number;
    quoteDays?: number;
  };
}

export interface RequestDetail extends RequestSummary {
  quotes: Quote[];
  requirements?: Record<string, unknown> | null;
  bookingId?: string | null;
}

export interface PaymentSummary {
  currency: string;
  originalTotal: Money;
  contractTotal: Money;
  capturedTotal: Money;
  refundedTotal: Money;
  netPaid: Money;
  balanceDue: Money;
  refundDue: Money;
  depositTarget: Money;
  depositDue: Money;
  status: string;
}

export interface BookingSummary {
  id: string;
  reference: string;
  status: string;
  version: number;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  currency: string;
  quoteId?: string | null;
  paymentSummary: PaymentSummary;
  availableActions?: string[];
}

export interface PaymentPosting {
  id: string;
  amountMinor: Money;
  currency: string;
  provider: string;
  settledAt?: string | null;
}

export interface BookingDetail extends BookingSummary {
  timezone?: string;
  travelers?: Array<{ id: string; fullName: string; band: string; isLead: boolean }>;
  pickup?: { label?: string; address?: string } | null;
  requirements?: Record<string, unknown> | null;
  quoteId?: string | null;
  itinerary?: { content?: ItineraryContent } | ItineraryContent | null;
  policySnapshot?: {
    id?: string;
    summary?: string;
    depositBasisPoints?: number;
    balanceDaysBefore?: number;
  };
  postings?: PaymentPosting[];
  documents?: PortalDocument[];
}

export interface PortalDocument {
  id: string;
  type: string;
  status: string;
  error?: string | null;
  createdAt: string;
  bookingId?: string | null;
  sourceVersion?: string | null;
}

export interface PaymentIntent {
  id: string;
  bookingId: string;
  purpose: 'DEPOSIT' | 'FULL' | 'BALANCE';
  amount: { currency: string; minor: Money };
  status: string;
  state: string;
  provider: string;
  expiresAt: string;
  nextAction?: { type: string; intentId?: string; instructions?: string; phone?: string; providerReference?: string };
}

export interface PaymentIntentRow {
  id: string;
  bookingId: string;
  purpose: string;
  amountMinor: Money;
  currency: string;
  state: string;
  provider: string;
  createdAt: string;
  postings?: Array<{ id: string; amountMinor: Money; currency: string; settledAt: string | null }>;
}
