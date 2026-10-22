import { createHash, randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@ma/database';
import { date, emit, transaction } from './core.js';
import { fail } from './errors.js';

/** Marketing attribution captured from the public site. Bounded so leads stay queryable. */
export interface InquiryAttribution {
  source?: string;
  page?: string;
  locale?: 'en' | 'sw';
  landingPath?: string;
  utm?: Record<string, string>;
}

export interface PublicInquiryInput extends InquiryAttribution {
  name: string;
  email: string;
  phone?: string;
  country?: string;
  serviceSlug?: string;
  packageSlug?: string;
  travelDate?: string;
  adults?: number;
  children?: number;
  message: string;
  consent: true;
  /** Honeypot: hidden from people, irresistible to bots. */
  companyWebsite?: string;
  /** Future-proof: a page token issued by the site so replays can be rejected. */
  formToken?: string;
}

export interface InquiryRequestMeta { requestId: string; userAgent?: string; ip?: string }

export const INQUIRY_SOURCES = ['WEBSITE', 'WEBSITE_CONTACT', 'WEBSITE_PACKAGE', 'WEBSITE_RENTALS'] as const;
export type InquirySource = typeof INQUIRY_SOURCES[number];

const clean = (value: string | undefined, maximum: number) => value?.trim().slice(0, maximum) || undefined;
const attribution = (input: InquiryAttribution) => ({
  ...(clean(input.page, 300) ? { page: clean(input.page, 300) } : {}),
  ...(input.locale ? { locale: input.locale } : {}),
  ...(clean(input.landingPath, 300) ? { landingPath: clean(input.landingPath, 300) } : {}),
  ...(input.utm && Object.keys(input.utm).length ? { utm: Object.fromEntries(Object.entries(input.utm).map(([key, value]) => [key.slice(0, 40), String(value).trim().slice(0, 200)]).filter(([, value]) => value)) } : {}),
});

/**
 * Turns a validated public submission into the CRM record shape.
 * Returns `null` when the hidden honeypot field was filled (silent drop).
 * Kept pure so the contract can be unit-tested without a database.
 */
export function inquiryRecord(input: PublicInquiryInput, meta: InquiryRequestMeta = { requestId: randomUUID() }) {
  if (input.companyWebsite?.trim()) return null;
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const message = input.message.trim();
  if (name.length < 2) fail(422, 'VALIDATION_FAILED', 'Provide your name so the safari desk can reply.', { field: 'name' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(422, 'VALIDATION_FAILED', 'Provide a valid email address.', { field: 'email' });
  if (message.length < 10) fail(422, 'VALIDATION_FAILED', 'Tell us a little more about your trip.', { field: 'message' });
  if (input.consent !== true) fail(422, 'VALIDATION_FAILED', 'Consent is required before we can store your enquiry.', { field: 'consent' });
  const travelDate = input.travelDate ? date(input.travelDate) : undefined;
  const contact = {
    name,
    email,
    ...(clean(input.phone, 40) ? { phone: clean(input.phone, 40) } : {}),
    ...(clean(input.country, 120) ? { country: clean(input.country, 120) } : {}),
  };
  const requirements = {
    message,
    ...(travelDate ? { travelDate: travelDate.toISOString().slice(0, 10) } : {}),
    adults: input.adults ?? 1,
    children: input.children ?? 0,
    ...(clean(input.serviceSlug, 100) ? { serviceSlug: clean(input.serviceSlug, 100) } : {}),
    ...(clean(input.packageSlug, 100) ? { packageSlug: clean(input.packageSlug, 100) } : {}),
    ...attribution(input),
    ...(meta.userAgent ? { userAgent: meta.userAgent.slice(0, 300) } : {}),
    ...(meta.ip ? { ipHash: hashIp(meta.ip) } : {}),
    requestId: meta.requestId,
  };
  return { source: input.source ?? 'WEBSITE', contact, requirements };
}

/** Store a salted, truncated digest instead of a raw visitor IP. */
export function hashIp(ip: string, salt = 'ma-safaris-inquiry') {
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

export class InquiryService {
  constructor(public db: PrismaClient) {}

  async submit(input: PublicInquiryInput, meta: InquiryRequestMeta) {
    const record = inquiryRecord(input, meta);
    const receivedAt = new Date();
    // Honeypot: answer exactly like a success so bots get no feedback.
    if (!record) return { id: randomUUID(), status: 'NEW', receivedAt, duplicate: false };

    return transaction(this.db, async tx => {
      const contact = record.contact as { email: string };
      const requirement = record.requirements as { message: string };
      // Same visitor + identical brief within ten minutes is a retry/double tap, not a new lead.
      const recent = await tx.inquiry.findMany({
        where: { source: record.source, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, status: true, createdAt: true, contact: true, requirements: true },
      });
      const duplicate = recent.find(row => {
        const c = row.contact as { email?: string } | null;
        const r = row.requirements as { message?: string } | null;
        return c?.email === contact.email && r?.message === requirement.message;
      });
      if (duplicate) return { id: duplicate.id, status: duplicate.status, receivedAt: duplicate.createdAt, duplicate: true };

      const [profile, service, pkg] = await Promise.all([
        tx.customerProfile.findFirst({ where: { email: { equals: contact.email, mode: 'insensitive' } }, select: { id: true } }),
        input.serviceSlug ? tx.serviceCategory.findFirst({ where: { slug: input.serviceSlug, status: 'PUBLISHED' }, select: { id: true } }) : null,
        input.packageSlug ? tx.package.findFirst({ where: { slug: input.packageSlug, status: 'PUBLISHED' }, select: { id: true, title: true, categoryId: true } }) : null,
      ]);
      const requirements = {
        ...record.requirements,
        ...(pkg ? { packageTitle: pkg.title } : {}),
      };
      const row = await tx.inquiry.create({
        data: {
          ...(profile ? { customerId: profile.id } : {}),
          ...(service ?? pkg ? { serviceId: service?.id ?? pkg?.categoryId } : {}),
          source: record.source,
          contact: record.contact as Prisma.InputJsonValue,
          requirements: requirements as Prisma.InputJsonValue,
          status: 'NEW',
        },
        select: { id: true, status: true, createdAt: true },
      });
      await emit(tx, 'inquiry.received', row.id, 1, { source: record.source, hasCustomer: !!profile });
      return { id: row.id, status: row.status, receivedAt: row.createdAt, duplicate: false };
    });
  }
}

/** Small helper used by the API schema so both layers agree on attribution limits. */
export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
