import { describe, expect, it } from '@jest/globals';
import { inquiryRecord, type PublicInquiryInput } from '../../packages/backend/src/inquiries.js';

const base: PublicInquiryInput = {
  name: '  Alice Morgan ',
  email: '  ALICE@Example.com ',
  phone: ' +255 700 000 000 ',
  country: ' United Kingdom ',
  packageSlug: 'serengeti-five-days',
  serviceSlug: 'wildlife-safaris',
  travelDate: '2027-02-10',
  adults: 2,
  children: 1,
  message: '  We would like a private Serengeti safari with lodges.  ',
  consent: true,
  source: 'WEBSITE_PACKAGE',
  page: '/packages/serengeti-five-days',
  landingPath: '/?utm_source=google',
  utm: { utm_source: ' google ', utm_campaign: 'feb-safari' },
};

describe('Public inquiry contract', () => {
  it('normalises contact details, travel preferences and attribution into a CRM record', () => {
    const record = inquiryRecord(base, { requestId: 'req-1', userAgent: 'jest' });
    expect(record).not.toBeNull();
    expect(record!.source).toBe('WEBSITE_PACKAGE');
    expect(record!.contact).toEqual({ name: 'Alice Morgan', email: 'alice@example.com', phone: '+255 700 000 000', country: 'United Kingdom' });
    expect(record!.requirements).toMatchObject({
      message: 'We would like a private Serengeti safari with lodges.',
      travelDate: '2027-02-10',
      adults: 2,
      children: 1,
      packageSlug: 'serengeti-five-days',
      serviceSlug: 'wildlife-safaris',
      page: '/packages/serengeti-five-days',
      landingPath: '/?utm_source=google',
      requestId: 'req-1',
      userAgent: 'jest',
    });
    expect((record!.requirements as { utm: Record<string, string> }).utm).toEqual({ utm_source: 'google', utm_campaign: 'feb-safari' });
  });

  it('silently drops submissions that fill the honeypot', () => {
    expect(inquiryRecord({ ...base, companyWebsite: 'https://spam.example' })).toBeNull();
  });

  it('defaults to the WEBSITE source and one adult when the site omits them', () => {
    const record = inquiryRecord({ ...base, source: undefined, adults: undefined, children: undefined });
    expect(record!.source).toBe('WEBSITE');
    expect((record!.requirements as { adults: number; children: number }).adults).toBe(1);
    expect((record!.requirements as { children: number }).children).toBe(0);
  });

  it('rejects short messages, invalid email and missing consent', () => {
    expect(() => inquiryRecord({ ...base, message: 'too short' })).toThrow(/Tell us a little more/);
    expect(() => inquiryRecord({ ...base, email: 'not-an-email' })).toThrow(/valid email/);
    expect(() => inquiryRecord({ ...base, consent: false as unknown as true })).toThrow(/Consent/);
  });

  it('rejects impossible travel dates instead of storing them', () => {
    expect(() => inquiryRecord({ ...base, travelDate: '2027-02-31' })).toThrow(/Invalid calendar date/);
  });
});
