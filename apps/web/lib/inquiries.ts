/**
 * Public lead-capture helpers for the marketing site.
 * The website is the top of the safari funnel: every enquiry must land in the
 * CRM even when the visitor has no account and never installs the app.
 */

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:4000/v1').replace(/\/$/, '');

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
export type UtmKey = typeof UTM_KEYS[number];
export type Utm = Partial<Record<UtmKey, string>>;
export type InquirySource = 'WEBSITE' | 'WEBSITE_CONTACT' | 'WEBSITE_PACKAGE' | 'WEBSITE_RENTALS';

export interface Attribution { utm: Utm; landingPath?: string }

export interface InquiryPayload {
  name: string;
  email: string;
  phone?: string;
  message: string;
  travelDate?: string;
  adults?: number;
  children?: number;
  packageSlug?: string;
  serviceSlug?: string;
  source: InquirySource;
  page?: string;
  locale?: 'en' | 'sw';
  landingPath?: string;
  utm?: Utm;
  consent: true;
  companyWebsite?: string;
}

export interface InquiryReceipt { id: string; status: string; receivedAt?: string; duplicate?: boolean }

const STORAGE_KEY = 'ma-safaris-attribution';

function readSearch(search: string): Utm {
  const params = new URLSearchParams(search);
  const utm: Utm = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim();
    if (value) utm[key] = value.slice(0, 200);
  }
  return utm;
}

/** First-touch attribution: URL params win, session storage keeps the original campaign. */
export function captureAttribution(): Attribution {
  if (typeof window === 'undefined') return { utm: {} };
  let stored: Attribution = { utm: {} };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const record = parsed as { utm?: unknown; landingPath?: unknown };
        const utm = record.utm && typeof record.utm === 'object' && !Array.isArray(record.utm) ? record.utm as Utm : {};
        stored = { utm, landingPath: typeof record.landingPath === 'string' ? record.landingPath : undefined };
      }
    }
  } catch { stored = { utm: {} }; }
  const merged: Attribution = {
    utm: { ...stored.utm, ...readSearch(window.location.search) },
    landingPath: stored.landingPath || `${window.location.pathname}${window.location.search}`.slice(0, 300),
  };
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch { /* private mode */ }
  return merged;
}

export function whatsappHref(phone: string | null | undefined, options: { packageTitle?: string; reference?: string; page?: string; utm?: Utm } = {}): string | null {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const international = digits.startsWith('0') ? `255${digits.slice(1)}` : digits.startsWith('255') ? digits : digits.length === 9 ? `255${digits}` : digits;
  if (international.length < 10) return null;
  const campaign = options.utm && Object.keys(options.utm).length
    ? ` (${Object.entries(options.utm).map(([key, value]) => `${key}=${value}`).join('&')})`
    : '';
  const subject = options.packageTitle ? `"${options.packageTitle}"` : 'a Tanzania safari';
  const reference = options.reference ? ` Ref: ${options.reference}.` : '';
  const page = options.page ? ` Page: ${options.page}` : '';
  const text = `Habari M&A Safaris! I would like to plan ${subject}.${reference}${page}${campaign}`.slice(0, 900);
  return `https://wa.me/${international}?text=${encodeURIComponent(text)}`;
}

export function packageReference(packageSlug: string | undefined): string | undefined {
  return packageSlug ? `PKG-${packageSlug.replace(/[^a-z0-9-]/gi, '').toUpperCase()}` : undefined;
}

export async function submitInquiry(payload: InquiryPayload): Promise<InquiryReceipt> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/public/inquiries`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('We could not reach the safari desk. Check your connection and try again, or message us on WhatsApp.');
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? (body as { error?: { message?: unknown; code?: unknown } }).error : undefined;
    const message = typeof error?.message === 'string' ? error.message : '';
    if (response.status === 429) throw new Error('Too many enquiries from this connection. Please wait a few minutes or message us on WhatsApp.');
    throw new Error(message || 'We could not send your enquiry. Please try again or message us on WhatsApp.');
  }
  const data = body && typeof body === 'object' && 'data' in body ? (body as { data?: InquiryReceipt }).data : undefined;
  if (!data || typeof data.id !== 'string') throw new Error('The safari desk did not confirm the enquiry. Please try again.');
  return data;
}
