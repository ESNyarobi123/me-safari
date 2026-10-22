export type Role = 'CUSTOMER' | 'OPERATIONS' | 'DRIVER_GUIDE' | 'ADMIN';

export interface AdminUser {
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
  guideId?: string;
  phone?: string | null;
  preferences?: Record<string, unknown>;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AdminUser;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Record<string, unknown> = {},
    public requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:4010/v1'
).replace(/\/$/, '');

export const ROLE_CONTEXT: Role = 'ADMIN';

const ACCESS_KEY = 'ma.safaris.admin.access';
const REFRESH_KEY = 'ma.safaris.admin.refresh';

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
  /** Skip the automatic refresh-and-retry pass (used by refresh itself). */
  skipRefresh?: boolean;
  idempotencyKey?: string;
  reauthToken?: string;
  signal?: AbortSignal;
  /** Send without an Authorization header. */
  anonymous?: boolean;
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
  if (options.reauthToken) headers['X-Reauthentication-Token'] = options.reauthToken;
  return fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    cache: 'no-store',
  });
}

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

let refreshInFlight: Promise<Tokens> | null = null;

export async function refreshSession(): Promise<Tokens> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = readRefresh();
    if (!refreshToken) throw new ApiError(401, 'SESSION_REVOKED', 'No stored session.');
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
      throw new ApiError(
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
  meta: {
    requestId: string;
    limit?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
  };
}

/**
 * Every admin call is idempotent-safe: mutations receive a stable key that is
 * reused for the single automatic retry so a retried command can never double-apply.
 */
export async function requestEnvelope<T>(path: string, options: RequestOptions = {}): Promise<Envelope<T>> {
  const mutating = options.method && options.method !== 'GET';
  const idempotencyKey = options.idempotencyKey ?? (mutating ? newIdempotencyKey() : undefined);
  const attempt = (key?: string) =>
    rawFetch(path, { ...options, idempotencyKey: options.idempotencyKey ?? key });

  let response = await attempt(idempotencyKey);

  if (response.status === 401 && !options.skipRefresh && !options.anonymous) {
    try {
      await refreshSession();
    } catch {
      clearTokens();
      throw new ApiError(401, 'SESSION_REVOKED', 'Your session has expired. Sign in again.');
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
    throw new ApiError(
      response.status,
      error?.code ?? 'REQUEST_FAILED',
      error?.message ?? 'The request could not be completed.',
      error?.details ?? {},
      error?.requestId,
    );
  }

  if (payload.data === undefined) {
    throw new ApiError(response.status, 'EMPTY_RESPONSE', 'The server returned no data.');
  }
  return { data: payload.data, meta: payload.meta ?? { requestId: 'unknown' } };
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data } = await requestEnvelope<T>(path, options);
  return data;
}

/** Query-string builder that skips empty values and serialises dates. */
export function queryString(params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const entry of value) if (entry !== undefined && entry !== null && entry !== '') search.append(key, String(entry));
      continue;
    }
    search.set(key, value instanceof Date ? value.toISOString() : String(value));
  }
  const rendered = search.toString();
  return rendered ? `?${rendered}` : '';
}

/**
 * Downloads a binary/text response (CSV export, receipt) with the admin session attached.
 */
export async function download(path: string, options: RequestOptions = {}): Promise<{ blob: Blob; filename: string }> {
  const mutating = options.method && options.method !== 'GET';
  const response = await rawFetch(`${path}${mutating ? queryString(options.body as Record<string, unknown>) : ''}`, {
    ...options,
    method: options.method,
    idempotencyKey: options.idempotencyKey ?? (mutating ? newIdempotencyKey() : undefined),
  });
  if (!response.ok) {
    throw new ApiError(response.status, 'DOWNLOAD_FAILED', 'The file could not be downloaded.');
  }
  const disposition = response.headers.get('content-disposition') ?? '';
  const match = /filename="?([^";]+)"?/.exec(disposition);
  return { blob: await response.blob(), filename: match?.[1] ?? 'export.csv' };
}

/** Triggers a browser download from an in-memory blob. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ auth -- */

export async function login(email: string, password: string, deviceLabel?: string): Promise<Tokens> {
  const result = await request<Tokens>('/auth/login', {
    method: 'POST',
    body: { email, password, deviceLabel },
    anonymous: true,
    skipRefresh: true,
  });
  storeTokens(result);
  return result;
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch {
    /* signing out locally is what matters */
  } finally {
    clearTokens();
  }
}

export async function fetchMe(): Promise<AdminUser> {
  return request<AdminUser>('/me');
}
