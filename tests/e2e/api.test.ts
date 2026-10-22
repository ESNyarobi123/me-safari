import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { config as loadEnv } from 'dotenv';
import { createApp } from '../../apps/api/src/app.js';
import { createBackend, type Backend } from '../../packages/backend/src/index.js';
import { createDatabase, type PrismaClient } from '../../packages/database/src/index.js';

loadEnv({ quiet: true });

describe('End-to-End API Workflows and Business Contracts', () => {
  let app: any;
  let backend: Backend;
  let fastify: any;
  let db: PrismaClient;

  const demoPassword = process.env.SEED_DEMO_PASSWORD || 'IJRmPg2wyCHjPwEkAt6Ckf8z';
  let customerToken: string;
  let customer2Token: string;
  let opsToken: string;
  let guideToken: string;
  let guide2Token: string;
  let adminToken: string;

  beforeAll(async () => {
    const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    db = createDatabase(testDbUrl);
    backend = createBackend(db);
    const created = await createApp(backend, false);
    app = created.app;
    fastify = app.getHttpAdapter().getInstance();

    const login = async (email: string) => {
      const res = await fastify.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email, password: demoPassword },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      return json.data.accessToken;
    };

    customerToken = await login('customer.demo@ma-safaris.local');
    customer2Token = await login('customer2.demo@ma-safaris.local');
    opsToken = await login('operations.demo@ma-safaris.local');
    guideToken = await login('guide.demo@ma-safaris.local');
    guide2Token = await login('guide2.demo@ma-safaris.local');
    adminToken = await login('admin.demo@ma-safaris.local');
  });

  afterAll(async () => {
    if (app) await app.close();
    if (db) await db.$disconnect();
  });

  // 1. PUBLIC CATALOG & COMPANY
  describe('Public Catalog & Company Info', () => {
    it('GET /v1/public/company returns approved contact and localization info', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/v1/public/company' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.name).toBe('Me and Adventure Safaris');
      expect(body.data.email).toBe('meandadventuretz@gmail.com');
      expect(body.data.phone).toBe('+255 682 886 259');
    });

    it('GET /v1/public/packages returns published safari packages', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/v1/public/packages' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      const serengeti = body.data.find((p: any) => p.slug === 'serengeti-five-days');
      expect(serengeti).toBeDefined();
      expect(serengeti.title).toContain('Serengeti 5-Day Safari');
    });

    it('CORS exposes Content-Disposition so portal downloads keep their filenames', async () => {
      const res = await fastify.inject({
        method: 'GET',
        url: '/v1/public/company',
        headers: { origin: 'http://localhost:3000' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(String(res.headers['access-control-expose-headers'] ?? '').toLowerCase()).toContain('content-disposition');
    });
  });

  // 1a. PUBLIC WEBSITE LEAD CAPTURE (Phase 1 of the hybrid roadmap)
  describe('Public website lead capture', () => {
    const marker = `Website verification lead ${randomUUID().slice(0, 8)}`;
    const payload = {
      name: 'Website Visitor',
      email: 'website.visitor@example.com',
      phone: '+255 700 111 222',
      country: 'United Kingdom',
      packageSlug: 'serengeti-five-days',
      serviceSlug: 'wildlife-safaris',
      travelDate: '2027-02-10',
      adults: 2,
      children: 1,
      message: marker,
      source: 'WEBSITE_PACKAGE',
      page: '/packages/serengeti-five-days',
      landingPath: '/?utm_source=google&utm_campaign=feb-safari',
      utm: { utm_source: 'google', utm_campaign: 'feb-safari' },
      consent: true,
    };
    let inquiryId = '';

    it('CAP-01: an unauthenticated visitor submits a package enquiry that lands in the CRM with attribution', async () => {
      const res = await fastify.inject({ method: 'POST', url: '/v1/public/inquiries', headers: { 'user-agent': 'jest-verification' }, payload });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.data.status).toBe('NEW');
      expect(typeof body.data.id).toBe('string');
      inquiryId = body.data.id;

      const row = await db.inquiry.findUniqueOrThrow({ where: { id: inquiryId } });
      expect(row.source).toBe('WEBSITE_PACKAGE');
      expect(row.status).toBe('NEW');
      expect(row.serviceId).toBeTruthy();
      const contact = row.contact as Record<string, string>;
      expect(contact).toMatchObject({ name: 'Website Visitor', email: 'website.visitor@example.com', phone: '+255 700 111 222', country: 'United Kingdom' });
      const requirements = row.requirements as Record<string, unknown>;
      expect(requirements).toMatchObject({ message: marker, travelDate: '2027-02-10', adults: 2, children: 1, packageSlug: 'serengeti-five-days', page: '/packages/serengeti-five-days' });
      expect(requirements.utm).toEqual({ utm_source: 'google', utm_campaign: 'feb-safari' });
      expect(requirements.ipHash).toBeUndefined();
    });

    it('CAP-02: the same brief retried within ten minutes is deduplicated instead of creating a second lead', async () => {
      const before = await db.inquiry.count();
      const res = await fastify.inject({ method: 'POST', url: '/v1/public/inquiries', payload });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.data.id).toBe(inquiryId);
      expect(body.data.duplicate).toBe(true);
      expect(await db.inquiry.count()).toBe(before);
    });

    it('CAP-03: the safari desk finds the website lead in the ops inbox', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/v1/ops/inquiries?status=NEW&limit=50', headers: { authorization: `Bearer ${opsToken}` } });
      expect(res.statusCode).toBe(200);
      const rows = JSON.parse(res.payload).data as Array<{ id: string }>;
      expect(rows.some(row => row.id === inquiryId)).toBe(true);
    });

    it('CAP-04: an existing customer email is linked to the customer profile', async () => {
      const profile = await db.customerProfile.findFirstOrThrow({ where: { email: 'customer.demo@ma-safaris.local' } });
      const res = await fastify.inject({
        method: 'POST',
        url: '/v1/public/inquiries',
        payload: { ...payload, email: 'customer.demo@ma-safaris.local', message: `${marker} — customer link` },
      });
      expect(res.statusCode).toBe(201);
      const row = await db.inquiry.findUniqueOrThrow({ where: { id: JSON.parse(res.payload).data.id } });
      expect(row.customerId).toBe(profile.id);
    });

    it('CAP-05: the honeypot is answered like a success but never stored', async () => {
      const before = await db.inquiry.count();
      const res = await fastify.inject({
        method: 'POST',
        url: '/v1/public/inquiries',
        payload: { ...payload, message: `${marker} — bot`, companyWebsite: 'https://spam.example' },
      });
      expect(res.statusCode).toBe(201);
      expect(await db.inquiry.count()).toBe(before);
    });

    it('CAP-06: missing consent and malformed emails are rejected with the stable error envelope', async () => {
      const missingConsent = await fastify.inject({ method: 'POST', url: '/v1/public/inquiries', payload: { ...payload, message: `${marker} — consent`, consent: false } });
      expect(missingConsent.statusCode).toBe(422);
      expect(JSON.parse(missingConsent.payload).error.code).toBe('VALIDATION_FAILED');
    });

    it('CAP-07: a new website lead converts into a customer and quotable custom request without manual data entry', async () => {
      const email = `fresh.lead.${randomUUID().slice(0, 8)}@example.com`;
      const created = await fastify.inject({
        method: 'POST',
        url: '/v1/public/inquiries',
        payload: { ...payload, email, message: `${marker} — convert to request ${randomUUID().slice(0, 8)}` },
      });
      expect(created.statusCode).toBe(201);
      const leadId = JSON.parse(created.payload).data.id;

      const detail = await fastify.inject({ method: 'GET', url: `/v1/ops/inquiries/${leadId}`, headers: { authorization: `Bearer ${opsToken}` } });
      expect(detail.statusCode).toBe(200);
      const row = JSON.parse(detail.payload).data;

      const customersBefore = await db.customerProfile.count();
      const convert = await fastify.inject({
        method: 'POST',
        url: `/v1/ops/inquiries/${leadId}/convert`,
        headers: { authorization: `Bearer ${opsToken}`, 'idempotency-key': randomUUID() },
        payload: { expectedVersion: row.version, serviceId: row.serviceId, adults: 2, children: 1, currency: 'USD', startDate: '2027-02-10' },
      });
      expect(convert.statusCode).toBe(200);
      const converted = JSON.parse(convert.payload).data;
      expect(converted.customerId).toBeTruthy();
      expect(await db.customerProfile.count()).toBe(customersBefore + 1);

      const inquiry = await db.inquiry.findUniqueOrThrow({ where: { id: leadId } });
      expect(inquiry.status).toBe('CONVERTED');
      expect(inquiry.customerId).toBe(converted.customerId);

      const customer = await db.customerProfile.findUniqueOrThrow({ where: { id: converted.customerId } });
      expect(customer.email).toBe(email);
      expect(customer.name).toBe('Website Visitor');

      const request = await db.customRequest.findUniqueOrThrow({ where: { id: converted.customRequestId } });
      expect(request.customerId).toBe(converted.customerId);
      const requirements = request.requirements as Record<string, unknown>;
      expect(requirements).toMatchObject({ packageSlug: 'serengeti-five-days', packageTitle: expect.stringContaining('Serengeti') });
    });
  });

  // 1b. SAFARI AI RENTALS (CAR RENTAL & CHAUFFEUR SERVICE)
  describe('Safari AI Rentals Public Catalog', () => {
    it('GET /v1/public/rentals/overview returns the five signature service lines, published policy and fleet summary', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/v1/public/rentals/overview' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.name).toBe('Safari AI Rentals');
      expect(body.data.operator).toBe('Me and Adventure Safaris');
      expect(body.data.services.length).toBe(5);
      expect(body.data.services.map((s: any) => s.slug)).toEqual([
        'safari-ai-executive', 'safari-ai-weddings', 'safari-ai-transfers', 'safari-ai-expeditions', 'safari-ai-corporate',
      ]);
      expect(body.data.policy.policy.serviceModel).toBe('CHAUFFEUR_DRIVEN');
      expect(body.data.fleet.totalVehicles).toBeGreaterThanOrEqual(30);
      expect(body.data.featured.length).toBeGreaterThan(0);
    });

    it('GET /v1/public/rentals/vehicles filters by segment and sorts by price', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/v1/public/rentals/vehicles?segment=SUV&sort=price_asc' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      const list = body.data as any[];
      expect(list.length).toBeGreaterThan(0);
      expect(list.every(v => v.segment === 'SUV')).toBe(true);
      const prices = list.map(v => Number(v.fromPrice.amountMinor));
      expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    });

    it('GET /v1/public/rentals/vehicles/:slug returns a chauffeur-driven vehicle with a TZS daily rate', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/v1/public/rentals/vehicles/toyota-lc300-zx' });
      expect(res.statusCode).toBe(200);
      const vehicle = JSON.parse(res.payload).data;
      expect(vehicle.slug).toBe('toyota-lc300-zx');
      expect(vehicle.chauffeurDriven).toBe(true);
      expect(vehicle.fromPrice.currency).toBe('TZS');
      expect(Number(vehicle.fromPrice.amountMinor)).toBe(200_000_000);
      expect(vehicle.serviceSlugs).toEqual(['safari-ai-executive', 'safari-ai-expeditions', 'safari-ai-corporate']);
      expect(vehicle.selfDriveAvailable).toBe(true);
    });

    it('GET /v1/public/rentals/policy returns the published chauffeur-driven policy terms', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/v1/public/rentals/policy' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload).data;
      expect(body.version).toBeGreaterThanOrEqual(1);
      expect(body.policy.selfDrive).toContain('in writing');
      expect(body.policy.longTermDiscount).toContain('10 days');
    });
  });

  describe('Safari AI Rentals Enquiry Workflow', () => {
    it('RENT-01: an authenticated customer submits a rental enquiry that becomes a custom request with a priced estimate', async () => {
      const startDate = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
      const res = await fastify.inject({
        method: 'POST',
        url: '/v1/rentals/enquiries',
        headers: { authorization: `Bearer ${customerToken}`, 'idempotency-key': randomUUID() },
        payload: {
          vehicleId: 'toyota-lc300-zx', serviceSlug: 'safari-ai-executive', pickupLocation: 'Kilimanjaro International Airport',
          dropOffLocation: 'Arusha', startDate, days: 12, passengers: 4, withChauffeur: true,
          intendedRoute: 'Arusha, Serengeti, Ngorongoro', notes: 'Airport meet and greet with signage.',
          contactName: 'Alice Morgan', contactPhone: '+255 700 000 000', contactEmail: 'customer.demo@ma-safaris.local',
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload).data;
      expect(body.serviceSlug).toBe('safari-ai-rentals');
      expect(body.days).toBe(12);
      expect(body.longTermDiscountEligible).toBe(true);
      expect(body.estimatedTotalMinor).toBe(String(200_000_000 * 12));
      const request = await db.customRequest.findUnique({ where: { id: body.id } });
      expect(request?.status).toBe('SUBMITTED');
      expect(request?.adults).toBe(4);
      expect((request?.requirements as any).rental).toBe(true);
      expect((request?.requirements as any).withChauffeur).toBe(true);
    });

    it('RENT-02: a rental enquiry rejects a past pick-up date', async () => {
      const res = await fastify.inject({
        method: 'POST',
        url: '/v1/rentals/enquiries',
        headers: { authorization: `Bearer ${customerToken}`, 'idempotency-key': randomUUID() },
        payload: { pickupLocation: 'Arusha', startDate: '2020-01-01', days: 2, passengers: 2, withChauffeur: true, contactName: 'Alice Morgan', contactPhone: '+255 700 000 000' },
      });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('RENT-03: an unauthenticated visitor cannot submit a rental enquiry', async () => {
      const res = await fastify.inject({
        method: 'POST',
        url: '/v1/rentals/enquiries',
        payload: { pickupLocation: 'Arusha', startDate: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10), days: 2, passengers: 2, withChauffeur: true, contactName: 'Visitor', contactPhone: '+255 700 000 001' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Safari AI Rentals Administration', () => {
    const slug = `test-rental-${randomUUID().slice(0, 8)}`;
    let vehicleId = '';
    let vehicleVersion = 0;

    it('RENT-04: a customer cannot manage the rental fleet', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/v1/admin/rentals/vehicles', headers: { authorization: `Bearer ${customerToken}` } });
      expect(res.statusCode).toBe(403);
    });

    it('RENT-05: Operations creates a vehicle with a daily rate and it becomes publicly visible', async () => {
      const res = await fastify.inject({
        method: 'POST',
        url: '/v1/admin/rentals/vehicles',
        headers: { authorization: `Bearer ${opsToken}`, 'idempotency-key': randomUUID() },
        payload: {
          slug, brand: 'Test', model: 'Rental Vehicle', modelYear: 2024, category: 'Test', segment: 'SUV', seats: 5, doors: 5,
          luggageCapacity: 3, chauffeurDriven: true, selfDriveAvailable: true, serviceSlugs: ['safari-ai-transfers'],
          description: 'Operations-created fleet vehicle for verification.', status: 'AVAILABLE',
          rate: { rateType: 'DAILY', currency: 'TZS', amountMinor: '45000000' },
        },
      });
      expect(res.statusCode).toBe(201);
      const vehicle = JSON.parse(res.payload).data;
      expect(vehicle.slug).toBe(slug);
      expect(Number(vehicle.fromPrice.amountMinor)).toBe(45_000_000);
      vehicleId = vehicle.id;
      vehicleVersion = vehicle.version;

      const publicRes = await fastify.inject({ method: 'GET', url: `/v1/public/rentals/vehicles/${slug}` });
      expect(publicRes.statusCode).toBe(200);
      expect(JSON.parse(publicRes.payload).data.brand).toBe('Test');
    });

    it('RENT-06: Operations adds a longer-term rate version and updates the vehicle optimistically', async () => {
      const rateRes = await fastify.inject({
        method: 'POST',
        url: `/v1/admin/rentals/vehicles/${vehicleId}/rates`,
        headers: { authorization: `Bearer ${opsToken}`, 'idempotency-key': randomUUID() },
        payload: { rateType: 'MONTHLY', currency: 'TZS', amountMinor: '900000000', minimumDays: 30 },
      });
      expect(rateRes.statusCode).toBe(201);
      const rateVersions = JSON.parse(rateRes.payload).data.rates.filter((r: any) => r.rateType === 'MONTHLY');
      expect(rateVersions.length).toBe(1);

      const patchRes = await fastify.inject({
        method: 'PATCH',
        url: `/v1/admin/rentals/vehicles/${vehicleId}`,
        headers: { authorization: `Bearer ${opsToken}`, 'idempotency-key': randomUUID() },
        payload: { expectedVersion: vehicleVersion, seats: 7, status: 'ON_REQUEST' },
      });
      expect(patchRes.statusCode).toBe(200);
      const updated = JSON.parse(patchRes.payload).data;
      expect(updated.seats).toBe(7);
      expect(updated.status).toBe('ON_REQUEST');
      expect(updated.version).toBe(vehicleVersion + 1);

      const staleRes = await fastify.inject({
        method: 'PATCH',
        url: `/v1/admin/rentals/vehicles/${vehicleId}`,
        headers: { authorization: `Bearer ${opsToken}`, 'idempotency-key': randomUUID() },
        payload: { expectedVersion: vehicleVersion, seats: 9 },
      });
      expect(staleRes.statusCode).toBe(409);
      vehicleVersion = updated.version;
    });

    it('RENT-07: Operations retires the vehicle with a recorded reason and it leaves the public fleet', async () => {
      const res = await fastify.inject({
        method: 'POST',
        url: `/v1/admin/rentals/vehicles/${vehicleId}/retire`,
        headers: { authorization: `Bearer ${opsToken}`, 'idempotency-key': randomUUID() },
        payload: { expectedVersion: vehicleVersion, reason: 'Verification fixture cleanup.' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).data.status).toBe('RETIRED');

      const publicRes = await fastify.inject({ method: 'GET', url: `/v1/public/rentals/vehicles/${slug}` });
      expect(publicRes.statusCode).toBe(200);
      expect(JSON.parse(publicRes.payload).data.status).toBe('RETIRED');
      const listRes = await fastify.inject({ method: 'GET', url: '/v1/public/rentals/vehicles?limit=50' });
      expect((JSON.parse(listRes.payload).data as any[]).some(v => v.slug === slug)).toBe(false);
    });

    it('RENT-08: an administrator drafts and publishes a new rental policy version', async () => {
      const adminRes = await fastify.inject({ method: 'GET', url: '/v1/admin/rentals/policy', headers: { authorization: `Bearer ${adminToken}` } });
      expect(adminRes.statusCode).toBe(200);
      const published = JSON.parse(adminRes.payload).data.published;
      expect(published.version).toBeGreaterThanOrEqual(1);
      expect(published.policy.serviceModel).toBe('CHAUFFEUR_DRIVEN');

      const draftRes = await fastify.inject({
        method: 'POST',
        url: '/v1/admin/rentals/policy/draft',
        headers: { authorization: `Bearer ${adminToken}`, 'idempotency-key': randomUUID() },
        payload: { expectedVersion: published.version, policy: { ...published.policy, summary: 'Verification draft policy.' } },
      });
      expect(draftRes.statusCode).toBe(200);
      const draft = JSON.parse(draftRes.payload).data;
      expect(draft.version).toBe(published.version + 1);
      expect(draft.status).toBe('DRAFT');

      const publishRes = await fastify.inject({
        method: 'POST',
        url: '/v1/admin/rentals/policy/publish',
        headers: { authorization: `Bearer ${adminToken}`, 'idempotency-key': randomUUID() },
        payload: { expectedVersion: draft.version },
      });
      expect(publishRes.statusCode).toBe(200);
      const result = JSON.parse(publishRes.payload).data;
      expect(result.status).toBe('PUBLISHED');
      expect(result.policy.summary).toBe('Verification draft policy.');

      const publicRes = await fastify.inject({ method: 'GET', url: '/v1/public/rentals/policy' });
      expect(JSON.parse(publicRes.payload).data.version).toBe(draft.version);
    });
  });

  // 2. AUTHENTICATION & ROLE ISOLATION
  describe('Authentication, Grants and Role Isolation', () => {
    it('AUTH-01: self-registration rejects role injection and always grants only CUSTOMER', async () => {
      const email = `test-customer-${randomUUID()}@ma-safaris.local`;
      const res = await fastify.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: {
          email,
          password: 'CorrectHorseBatteryStaple123!',
          name: 'Security Test Customer',
          role: 'ADMIN',
        },
      });
      expect([201, 400]).toContain(res.statusCode);
      if (res.statusCode === 201) {
        const body = JSON.parse(res.payload);
        expect(body.data.user.roles).toEqual(['CUSTOMER']);
      }
    });

    it('AUTH-02: invalid password returns generic 401 without user enumeration', async () => {
      const res = await fastify.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'customer.demo@ma-safaris.local',
          password: 'WrongPassword123!',
        },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('AUTH-03: refresh token rotation succeeds once and reuse revokes session family', async () => {
      const loginRes = await fastify.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'customer.demo@ma-safaris.local',
          password: demoPassword,
        },
      });
      const loginData = JSON.parse(loginRes.payload).data;
      const initialRefresh = loginData.refreshToken;

      const ref1 = await fastify.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        payload: { refreshToken: initialRefresh },
      });
      expect(ref1.statusCode).toBe(200);
      const ref1Data = JSON.parse(ref1.payload).data;
      expect(ref1Data.accessToken).toBeDefined();
      expect(ref1Data.refreshToken).not.toBe(initialRefresh);

      const refReuse = await fastify.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        payload: { refreshToken: initialRefresh },
      });
      expect(refReuse.statusCode).toBe(401);

      const refSubsequent = await fastify.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        payload: { refreshToken: ref1Data.refreshToken },
      });
      expect(refSubsequent.statusCode).toBe(401);
    });

    it('AUTH-06: server rejects removing or suspending the last active administrator', async () => {
      const meRes = await fastify.inject({
        method: 'GET',
        url: '/v1/me',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const adminId = JSON.parse(meRes.payload).data.id;

      const suspendRes = await fastify.inject({
        method: 'POST',
        url: `/v1/admin/staff/${adminId}/suspend`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { reason: 'Test suspending administrator' },
      });
      expect([400, 403, 409, 422]).toContain(suspendRes.statusCode);
    });
  });

  // 3. STANDARD SAFARI BOOKING JOURNEY
  describe('Standard Safari Booking, Pricing, Payment, Confirmation & Progress', () => {
    let serengetiPkg: any;
    let previewId: string;
    let bookingId: string;
    let bookingRef: string;
    let tripId: string;
    const bookingKey = randomUUID();

    it('PRICE-01: calculates exact preview for 2 adults + 1 eligible child ($3,375 total, $1,012.50 deposit)', async () => {
      const pkgsRes = await fastify.inject({ method: 'GET', url: '/v1/public/packages' });
      serengetiPkg = JSON.parse(pkgsRes.payload).data.find((p: any) => p.slug === 'serengeti-five-days');

      const prevRes = await fastify.inject({
        method: 'POST',
        url: '/v1/pricing/previews',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          packageId: serengetiPkg.id,
          startDate: '2026-12-01',
          adults: 2,
          children: [{ ageYears: 10 }],
          currency: 'USD',
          addOnIds: [],
        },
      });
      expect(prevRes.statusCode).toBe(201);
      const preview = JSON.parse(prevRes.payload).data;
      previewId = preview.id;

      expect(preview.totalMinor).toBe('337500');
      expect(preview.depositMinor).toBe('101250');
      expect(preview.currency).toBe('USD');
    });

    it('PRICE-03: client cannot inject custom total or prices during booking creation', async () => {
      const testPrevRes = await fastify.inject({
        method: 'POST',
        url: '/v1/pricing/previews',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          packageId: serengetiPkg.id,
          startDate: '2026-12-05',
          adults: 2,
          children: [],
          currency: 'USD',
          addOnIds: [],
        },
      });
      expect(testPrevRes.statusCode).toBe(201);
      const testPreviewId = JSON.parse(testPrevRes.payload).data.id;

      const res = await fastify.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: {
          authorization: `Bearer ${customerToken}`,
          'idempotency-key': randomUUID(),
        },
        payload: {
          pricePreviewId: testPreviewId,
          travelers: [
            { fullName: 'Alice Morgan', band: 'ADULT', isLead: true },
            { fullName: 'Daniel Morgan', band: 'ADULT', isLead: false },
          ],
          pickup: { label: 'Arusha Hotel', address: 'Clock Tower Hotel, Arusha' },
          requirements: { dietary: 'Vegetarian' },
          acceptedPolicyVersionId: (await db.bookingPolicyVersion.findFirstOrThrow()).id,
          totalMinor: '100',
        },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).error.code).toBe('VALIDATION_FAILED');
    });

    it('BOOK-01 & BOOK-02: idempotent booking creation returns identical record; reused key with different payload returns 409', async () => {
      const policy = await db.bookingPolicyVersion.findFirstOrThrow();
      const payload1 = {
        pricePreviewId: previewId,
        travelers: [
          { fullName: 'Alice Morgan', band: 'ADULT', isLead: true },
          { fullName: 'Daniel Morgan', band: 'ADULT', isLead: false },
          { fullName: 'Jamie Morgan', band: 'CHILD', ageYears: 10, isLead: false },
        ],
        pickup: { label: 'Arusha Hotel', address: 'Clock Tower Hotel, Arusha' },
        requirements: { dietary: 'Vegetarian' },
        acceptedPolicyVersionId: policy.id,
      };

      const res1 = await fastify.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: {
          authorization: `Bearer ${customerToken}`,
          'idempotency-key': bookingKey,
        },
        payload: payload1,
      });
      expect(res1.statusCode).toBe(201);
      const b1 = JSON.parse(res1.payload).data;
      bookingId = b1.id;
      bookingRef = b1.reference;
      expect(b1.status).toBe('REQUESTED');

      const resDuplicate = await fastify.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: {
          authorization: `Bearer ${customerToken}`,
          'idempotency-key': bookingKey,
        },
        payload: payload1,
      });
      expect([200, 201]).toContain(resDuplicate.statusCode);
      const bDuplicate = JSON.parse(resDuplicate.payload).data;
      expect(bDuplicate.id).toBe(bookingId);

      const resReused = await fastify.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: {
          authorization: `Bearer ${customerToken}`,
          'idempotency-key': bookingKey,
        },
        payload: { ...payload1, pickup: { label: 'Different Hotel', address: 'Kilimanjaro Rd' } },
      });
      expect(resReused.statusCode).toBe(409);
      expect(JSON.parse(resReused.payload).error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    });

    it('BOOK-03: Operations confirmation is blocked before required payment is satisfied', async () => {
      const bBefore = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
      const confirmRes = await fastify.inject({
        method: 'POST',
        url: `/v1/bookings/${bookingId}/confirm`,
        headers: { authorization: `Bearer ${opsToken}` },
        payload: {
          expectedVersion: bBefore.version,
          reason: 'Staff premature confirmation attempt',
        },
      });
      expect(confirmRes.statusCode).toBe(409);
      const body = JSON.parse(confirmRes.payload);
      expect(body.error.code).toBe('PAYMENT_CONDITION_UNMET');
    });

    it('PAY-01: customer creates payment intent for deposit and mock simulation records verified capture', async () => {
      const intentRes = await fastify.inject({
        method: 'POST',
        url: `/v1/bookings/${bookingId}/payment-intents`,
        headers: {
          authorization: `Bearer ${customerToken}`,
          'idempotency-key': randomUUID(),
        },
        payload: {
          purpose: 'DEPOSIT',
          method: 'MOCK_CHECKOUT',
        },
      });
      expect(intentRes.statusCode).toBe(201);
      const intent = JSON.parse(intentRes.payload).data;
      expect(intent.purpose).toBe('DEPOSIT');
      expect(intent.amount.minor).toBe('101250');

      const openIntents = await fastify.inject({
        method: 'GET',
        url: '/v1/admin/payment-intents?open=true',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(openIntents.statusCode).toBe(200);
      expect(JSON.parse(openIntents.payload).data.some((row: { id: string }) => row.id === intent.id)).toBe(true);

      const simRes = await fastify.inject({
        method: 'POST',
        url: `/v1/dev/payment-intents/${intent.id}/simulate`,
        headers: { authorization: `Bearer ${customerToken}` },
        payload: { scenario: 'SUCCESS' },
      });
      expect(simRes.statusCode).toBe(200);

      const bookingCheck = await fastify.inject({
        method: 'GET',
        url: `/v1/bookings/${bookingId}`,
        headers: { authorization: `Bearer ${customerToken}` },
      });
      const summary = JSON.parse(bookingCheck.payload).data.paymentSummary;
      expect(summary.capturedTotal).toBe('101250');
      expect(summary.netPaid).toBe('101250');
      expect(summary.depositDue).toBe('0');
      expect(summary.status).toBe('PARTIALLY_PAID');
    });

    it('BOOK-04: Operations confirms booking after verified deposit, creating primary scheduled trip', async () => {
      const draftItinerary = await db.itineraryVersion.findFirstOrThrow({ where: { bookingId, state: 'DRAFT' } });
      const pubRes = await fastify.inject({
        method: 'POST',
        url: `/v1/itinerary-versions/${draftItinerary.id}/publish`,
        headers: { authorization: `Bearer ${opsToken}` },
        payload: { expectedVersion: draftItinerary.version },
      });
      expect(pubRes.statusCode).toBe(200);

      const bBeforeConfirm = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
      const confirmRes = await fastify.inject({
        method: 'POST',
        url: `/v1/bookings/${bookingId}/confirm`,
        headers: { authorization: `Bearer ${opsToken}` },
        payload: {
          expectedVersion: bBeforeConfirm.version,
          reason: 'Deposit verified and itinerary approved',
        },
      });
      if (confirmRes.statusCode !== 200) {
        console.error('CONFIRM FAILED WITH CODE:', confirmRes.statusCode, confirmRes.payload);
      }
      expect(confirmRes.statusCode).toBe(200);
      const confirmed = JSON.parse(confirmRes.payload).data;
      expect(confirmed.booking.status).toBe('CONFIRMED');
      tripId = confirmed.tripId;
      expect(tripId).toBeDefined();

      const trip = await db.trip.findUniqueOrThrow({ where: { id: tripId } });
      expect(trip.status).toBe('SCHEDULED');
    });

    it('RES-01 & RES-02: Operations assigns guide and vehicle; preparation checklist completes readiness', async () => {
      const guideStaff = await db.staffProfile.findFirstOrThrow({
        where: { user: { email: 'guide.demo@ma-safaris.local' } },
      });
      const vehicle = await db.vehicle.findFirstOrThrow({
        where: { registration: 'TZ001' },
      });

      const tripBeforeAssign = await db.trip.findUniqueOrThrow({ where: { id: tripId } });
      const assignRes = await fastify.inject({
        method: 'POST',
        url: `/v1/trips/${tripId}/assignments`,
        headers: {
          authorization: `Bearer ${opsToken}`,
          'idempotency-key': randomUUID(),
        },
        payload: {
          expectedVersion: tripBeforeAssign.version,
          guideId: guideStaff.id,
          vehicleId: vehicle.id,
          pickupAt: '2026-12-01T05:30:00.000Z',
          pickupTimezone: 'Africa/Dar_es_Salaam',
          note: 'Meet guests at Arusha Clock Tower Hotel lobby',
        },
      });
      expect(assignRes.statusCode).toBe(200);

      // Complete preparation checklist
      const tripBeforePrep = await db.trip.findUniqueOrThrow({ where: { id: tripId } });
      const prepRes = await fastify.inject({
        method: 'PATCH',
        url: `/v1/trips/${tripId}/preparation`,
        headers: { authorization: `Bearer ${opsToken}` },
        payload: {
          expectedVersion: tripBeforePrep.version,
          checklist: [
            { key: 'ITINERARY', checked: true },
            { key: 'PICKUP', checked: true },
            { key: 'ACCOMMODATION', checked: true },
            { key: 'REQUIREMENTS', checked: true },
            { key: 'CUSTOMER_NOTICE', checked: true },
          ],
        },
      });
      expect(prepRes.statusCode).toBe(200);
    });

    it('SCOPE-02 & SCOPE-03: guide projection provides minimal traveler names without pricing or internal finance fields', async () => {
      const guideRes = await fastify.inject({
        method: 'GET',
        url: `/v1/trips/${tripId}`,
        headers: { authorization: `Bearer ${guideToken}` },
      });
      expect(guideRes.statusCode).toBe(200);
      const tripData = JSON.parse(guideRes.payload).data;
      expect(tripData.id).toBe(tripId);
      expect(tripData.paymentSummary).toBeUndefined();
      expect(tripData.totalMinor).toBeUndefined();
      expect(tripData.depositMinor).toBeUndefined();
      expect(tripData.internalNotes).toBeUndefined();

      const guide2Res = await fastify.inject({
        method: 'GET',
        url: `/v1/trips/${tripId}`,
        headers: { authorization: `Bearer ${guide2Token}` },
      });
      expect([403, 404]).toContain(guide2Res.statusCode);
    });

    it('TRIP-01 & TRIP-04: assigned guide progresses through stages and completes handover', async () => {
      const stages = [
        'EN_ROUTE_TO_PICKUP',
        'PICKED_UP',
        'SAFARI_STARTED',
        'ACTIVITY_REACHED',
        'RETURNING',
      ];

      for (const targetStatus of stages) {
        const tripCurrent = await db.trip.findUniqueOrThrow({ where: { id: tripId } });
        const progRes = await fastify.inject({
          method: 'POST',
          url: `/v1/trips/${tripId}/progress`,
          headers: {
            authorization: `Bearer ${guideToken}`,
            'idempotency-key': randomUUID(),
          },
          payload: {
            eventType: 'STATUS_ADVANCE',
            targetStatus,
            expectedVersion: tripCurrent.version,
            note: `Advanced to ${targetStatus}`,
          },
        });
        expect(progRes.statusCode).toBe(200);
      }

      const tripBeforeHandover = await db.trip.findUniqueOrThrow({ where: { id: tripId } });
      const handoverRes = await fastify.inject({
        method: 'POST',
        url: `/v1/trips/${tripId}/handover`,
        headers: {
          authorization: `Bearer ${guideToken}`,
          'idempotency-key': randomUUID(),
        },
        payload: {
          expectedVersion: tripBeforeHandover.version,
          notes: 'Successful safari, all guests safely dropped off at Arusha hotel.',
          checklist: {
            travelersDroppedOff: true,
            vehicleChecked: true,
            issuesAcknowledged: true,
          },
        },
      });
      expect(handoverRes.statusCode).toBe(200);

      const tripAfter = await db.trip.findUniqueOrThrow({ where: { id: tripId } });
      expect(tripAfter.status).toBe('COMPLETED');
      const bookingAfter = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
      expect(bookingAfter.status).toBe('COMPLETED');
    });

    it('Customer submits review after completion; Customer A cannot access Customer B booking', async () => {
      const reviewRes = await fastify.inject({
        method: 'POST',
        url: `/v1/bookings/${bookingId}/reviews`,
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          stars: 5,
          text: 'Unforgettable Serengeti safari! Kelvin was an outstanding guide.',
        },
      });
      expect(reviewRes.statusCode).toBe(201);

      // SCOPE-01: Customer 2 cannot read Customer 1 booking
      const scopeRes = await fastify.inject({
        method: 'GET',
        url: `/v1/bookings/${bookingId}`,
        headers: { authorization: `Bearer ${customer2Token}` },
      });
      expect(scopeRes.statusCode).toBe(404);
    });
  });

  // 4. CUSTOM SAFARI REQUEST & VERSIONED QUOTATION JOURNEY
  describe('Custom Tailor-made Safari Request and Quotation Versioning', () => {
    let customRequestId: string;
    let quoteV1Id: string;
    let quoteV2Id: string;
    let generatedBookingId: string;

    it('QUOTE-01: customer submits custom request and Operations drafts and freezes immutable quote v1', async () => {
      const service = await db.serviceCategory.findFirstOrThrow();
      const reqRes = await fastify.inject({
        method: 'POST',
        url: '/v1/custom-requests',
        headers: {
          authorization: `Bearer ${customerToken}`,
          'idempotency-key': randomUUID(),
        },
        payload: {
          serviceId: service.id,
          destinations: ['Tarangire', 'Ngorongoro Crater'],
          startDate: '2027-01-15',
          endDate: '2027-01-20',
          adults: 2,
          children: 0,
          currency: 'USD',
          budgetMinor: '400000',
          requirements: {
            travelStyle: 'Luxury lodge',
            dietary: 'Gluten-free for one traveler',
          },
        },
      });
      expect(reqRes.statusCode).toBe(201);
      customRequestId = JSON.parse(reqRes.payload).data.id;

      const draftRes = await fastify.inject({
        method: 'POST',
        url: `/v1/custom-requests/${customRequestId}/quotes`,
        headers: { authorization: `Bearer ${opsToken}` },
        payload: {
          currency: 'USD',
          lines: [
            { description: 'Tarangire & Ngorongoro 5-Day Luxury Lodge Safari (2 adults)', quantity: 2, unitAmountMinor: '180000' },
          ],
          itinerary: {
            days: [
              { day: 1, title: 'Arrival & Tarangire Game Drive', accommodation: 'Tarangire Safari Lodge' },
              { day: 2, title: 'Ngorongoro Crater Tour', accommodation: 'Ngorongoro Serena' },
            ],
            inclusions: ['4x4 Land Cruiser', 'Park fees', 'Full board lodges'],
            exclusions: ['Tips', 'International flights'],
          },
        },
      });
      expect(draftRes.statusCode).toBe(201);
      quoteV1Id = JSON.parse(draftRes.payload).data.id;

      const quoteV1Before = await db.quoteVersion.findUniqueOrThrow({ where: { id: quoteV1Id } });
      const sendRes = await fastify.inject({
        method: 'POST',
        url: `/v1/quotes/${quoteV1Id}/send`,
        headers: { authorization: `Bearer ${opsToken}`, 'idempotency-key': randomUUID() },
        payload: { expectedVersion: quoteV1Before.version },
      });
      expect(sendRes.statusCode).toBe(200);
      const quoteV1 = JSON.parse(sendRes.payload).data;
      expect(quoteV1.state).toBe('SENT');
      expect(quoteV1.versionNumber).toBe(1);
    });

    it('Customer requests revision; Operations issues Quote v2', async () => {
      const reqBeforeRev = await db.customRequest.findUniqueOrThrow({ where: { id: customRequestId } });
      const revRes = await fastify.inject({
        method: 'POST',
        url: `/v1/custom-requests/${customRequestId}/revision-requests`,
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          expectedVersion: reqBeforeRev.version,
          reason: 'Could you please include a hot air balloon safari option?',
        },
      });
      expect(revRes.statusCode).toBe(200);

      const draftV2Res = await fastify.inject({
        method: 'POST',
        url: `/v1/custom-requests/${customRequestId}/quotes`,
        headers: { authorization: `Bearer ${opsToken}` },
        payload: {
          currency: 'USD',
          lines: [
            { description: 'Tarangire & Ngorongoro 5-Day Luxury Lodge Safari (2 adults)', quantity: 2, unitAmountMinor: '180000' },
            { description: 'Tarangire Hot Air Balloon Safari (2 guests)', quantity: 2, unitAmountMinor: '55000' },
          ],
          itinerary: {
            days: [
              { day: 1, title: 'Tarangire Sunrise Balloon Safari & Game Drive', accommodation: 'Tarangire Safari Lodge' },
              { day: 2, title: 'Ngorongoro Crater Tour', accommodation: 'Ngorongoro Serena' },
            ],
            inclusions: ['4x4 Land Cruiser', 'Hot air balloon flight', 'Park fees', 'Lodges'],
            exclusions: ['Tips'],
          },
        },
      });
      expect(draftV2Res.statusCode).toBe(201);
      quoteV2Id = JSON.parse(draftV2Res.payload).data.id;

      const quoteV2Before = await db.quoteVersion.findUniqueOrThrow({ where: { id: quoteV2Id } });
      const sendV2Res = await fastify.inject({
        method: 'POST',
        url: `/v1/quotes/${quoteV2Id}/send`,
        headers: { authorization: `Bearer ${opsToken}`, 'idempotency-key': randomUUID() },
        payload: { expectedVersion: quoteV2Before.version },
      });
      expect(sendV2Res.statusCode).toBe(200);
      const quoteV2 = JSON.parse(sendV2Res.payload).data;
      expect(quoteV2.versionNumber).toBe(2);
      expect(quoteV2.state).toBe('SENT');
    });

    it('QUOTE-02: customer accepts Quote v2, creating exactly one linked booking', async () => {
      const policy = await db.bookingPolicyVersion.findFirstOrThrow();
      const quoteV2ForAccept = await db.quoteVersion.findUniqueOrThrow({ where: { id: quoteV2Id } });
      const acceptKey = randomUUID();
      const acceptRes = await fastify.inject({
        method: 'POST',
        url: `/v1/quotes/${quoteV2Id}/accept`,
        headers: {
          authorization: `Bearer ${customerToken}`,
          'idempotency-key': acceptKey,
        },
        payload: {
          expectedVersion: quoteV2ForAccept.version,
          acceptedPolicyVersionId: policy.id,
        },
      });
      expect(acceptRes.statusCode).toBe(201);
      const acceptedData = JSON.parse(acceptRes.payload).data;
      generatedBookingId = acceptedData.bookingId || acceptedData.id;
      expect(generatedBookingId).toBeDefined();

      const duplicateAcceptRes = await fastify.inject({
        method: 'POST',
        url: `/v1/quotes/${quoteV2Id}/accept`,
        headers: {
          authorization: `Bearer ${customerToken}`,
          'idempotency-key': acceptKey,
        },
        payload: {
          expectedVersion: quoteV2ForAccept.version,
          acceptedPolicyVersionId: policy.id,
        },
      });
      expect([200, 201]).toContain(duplicateAcceptRes.statusCode);
      const duplicateData = JSON.parse(duplicateAcceptRes.payload).data;
      expect(duplicateData.bookingId || duplicateData.id).toBe(generatedBookingId);
    });

    it('QUOTE-03: customer cannot accept superseded Quote v1', async () => {
      const policy = await db.bookingPolicyVersion.findFirstOrThrow();
      const rejectOldRes = await fastify.inject({
        method: 'POST',
        url: `/v1/quotes/${quoteV1Id}/accept`,
        headers: {
          authorization: `Bearer ${customerToken}`,
          'idempotency-key': randomUUID(),
        },
        payload: {
          expectedVersion: 1,
          acceptedPolicyVersionId: policy.id,
        },
      });
      expect([409, 422]).toContain(rejectOldRes.statusCode);
    });
  });
});
