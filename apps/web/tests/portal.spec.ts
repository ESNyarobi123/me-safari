import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Portal UI contract tests.
 *
 * The static site is exported ahead of time, so these tests intercept the
 * public API at the network boundary and exercise the real portal components:
 * sign-in hand-off, proposal acceptance and the verified deposit checkout.
 */

const USER = {
  id: 'user-customer',
  email: 'customer@example.com',
  name: 'Amina Mwinyi',
  locale: 'en',
  status: 'ACTIVE',
  version: 1,
  emailVerified: true,
  roles: ['CUSTOMER'],
  permissions: [],
  customerId: 'customer-1',
};

const START = '2027-02-10T00:00:00.000Z';
const END = '2027-02-16T00:00:00.000Z';
const SENT_AT = '2026-10-01T09:00:00.000Z';
const EXPIRES_AT = '2026-11-01T09:00:00.000Z';
const REFERENCE = 'MA-2027-TEST0001';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type,idempotency-key,x-role-context',
  'access-control-expose-headers': 'content-disposition',
};

function send(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    body: JSON.stringify({ data, meta: { requestId: 'portal-test' } }),
  });
}

function quote(state: 'SENT' | 'ACCEPTED') {
  return {
    id: 'quote-1',
    requestId: 'request-1',
    state,
    version: 7,
    versionNumber: 1,
    totalMinor: '340000',
    depositMinor: '102000',
    currency: 'USD',
    sentAt: SENT_AT,
    expiresAt: EXPIRES_AT,
    acceptedAt: state === 'ACCEPTED' ? '2026-10-02T10:00:00.000Z' : null,
    priceSnapshot: { startDate: START, endDate: END },
    policySnapshot: {
      id: 'policy-1',
      summary: 'A 30% deposit confirms the dates. The balance is due before travel.',
      depositBasisPoints: 3000,
      balanceDaysBefore: 7,
      quoteDays: 30,
    },
    lines: [
      {
        id: 'line-1',
        category: 'ACCOMMODATION',
        description: 'Tented camp · 4 nights',
        quantity: 1,
        unitAmountMinor: '240000',
        totalMinor: '240000',
      },
      {
        id: 'line-2',
        category: 'GUIDING',
        description: 'Private guide and vehicle',
        quantity: 1,
        unitAmountMinor: '100000',
        totalMinor: '100000',
      },
    ],
    itinerary: {
      content: {
        days: [
          { day: 1, title: 'Arrive in Arusha', description: 'Met at the airport and transferred to your lodge.' },
          { day: 2, title: 'Into the Serengeti', description: 'Morning drive with a picnic lunch en route.' },
        ],
        inclusions: ['Park fees', 'Private guide'],
      },
    },
  };
}

function requestDetail(state: 'SENT' | 'ACCEPTED', bookingId: string | null) {
  const current = quote(state);
  return {
    id: 'request-1',
    status: state === 'ACCEPTED' ? 'ACCEPTED' : 'QUOTED',
    version: 7,
    startDate: START,
    endDate: END,
    adults: 2,
    children: 0,
    currency: 'USD',
    budgetMinor: null,
    destinations: ['Serengeti', 'Ngorongoro'],
    service: { id: 'service-1', title: 'Serengeti & Ngorongoro', slug: 'serengeti-ngorongoro' },
    quotes: [current],
    createdAt: SENT_AT,
    bookingId,
  };
}

function requestSummary(state: 'SENT' | 'ACCEPTED') {
  const current = quote(state);
  return {
    id: 'request-1',
    status: state === 'ACCEPTED' ? 'ACCEPTED' : 'QUOTED',
    version: 7,
    startDate: START,
    endDate: END,
    adults: 2,
    children: 0,
    currency: 'USD',
    budgetMinor: null,
    destinations: ['Serengeti', 'Ngorongoro'],
    service: { id: 'service-1', title: 'Serengeti & Ngorongoro', slug: 'serengeti-ngorongoro' },
    quotes: [
      {
        id: current.id,
        state: current.state,
        version: current.version,
        versionNumber: current.versionNumber,
        totalMinor: current.totalMinor,
        currency: current.currency,
        expiresAt: current.expiresAt,
      },
    ],
    createdAt: current.sentAt,
  };
}

function paymentSummary(captured: boolean) {
  return {
    currency: 'USD',
    originalTotal: '340000',
    contractTotal: '340000',
    capturedTotal: captured ? '102000' : '0',
    refundedTotal: '0',
    netPaid: captured ? '102000' : '0',
    balanceDue: captured ? '238000' : '340000',
    refundDue: '0',
    depositTarget: '102000',
    depositDue: captured ? '0' : '102000',
    status: captured ? 'PARTIALLY_PAID' : 'UNPAID',
  };
}

function booking(captured: boolean) {
  return {
    id: 'booking-1',
    reference: REFERENCE,
    status: 'REQUESTED',
    version: 1,
    startDate: START,
    endDate: END,
    adults: 2,
    children: 0,
    currency: 'USD',
    quoteId: 'quote-1',
    paymentSummary: paymentSummary(captured),
    postings: captured
      ? [{ id: 'posting-1', amountMinor: '102000', currency: 'USD', provider: 'mock', settledAt: '2026-10-02T10:05:00.000Z' }]
      : [],
    documents: captured
      ? [{ id: 'document-1', type: 'RECEIPT', status: 'READY', createdAt: '2026-10-02T10:05:00.000Z', bookingId: 'booking-1' }]
      : [],
    travelers: [
      { id: 'traveler-1', fullName: 'Amina Mwinyi', band: 'ADULT', isLead: true },
      { id: 'traveler-2', fullName: 'Joseph Mwinyi', band: 'ADULT', isLead: false },
    ],
    pickup: { label: 'Kilimanjaro Airport', address: 'Terminal 1 arrivals' },
    timezone: 'Africa/Dar_es_Salaam',
    availableActions: [],
  };
}

function bookingSummary(captured: boolean) {
  const detail = booking(captured);
  return {
    id: detail.id,
    reference: detail.reference,
    status: detail.status,
    version: detail.version,
    startDate: detail.startDate,
    endDate: detail.endDate,
    adults: detail.adults,
    children: detail.children,
    currency: detail.currency,
    quoteId: detail.quoteId,
    paymentSummary: detail.paymentSummary,
    availableActions: [],
  };
}

function paymentIntent(status: 'PENDING' | 'CAPTURED') {
  return {
    id: 'intent-1',
    bookingId: 'booking-1',
    purpose: 'DEPOSIT',
    amount: { currency: 'USD', minor: '102000' },
    status,
    state: status,
    provider: 'mock',
    expiresAt: '2026-10-02T10:30:00.000Z',
    nextAction: { type: 'MOCK_CHECKOUT', intentId: 'intent-1' },
  };
}

interface PortalState {
  quoteState: 'SENT' | 'ACCEPTED';
  accepted: boolean;
  captured: boolean;
}

/** Mocks the customer API at the network edge and returns the mutable fixture state. */
async function mockPortal(page: Page): Promise<PortalState> {
  const state: PortalState = { quoteState: 'SENT', accepted: false, captured: false };

  await page.route('**/v1/**', async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });

    const path = new URL(request.url()).pathname.replace(/^\/v1/, '');

    if (method === 'POST' && path === '/auth/login') {
      return send(route, {
        accessToken: 'portal-access',
        refreshToken: 'portal-refresh',
        expiresIn: 900,
        user: USER,
      });
    }
    if (method === 'GET' && path === '/me') return send(route, USER);
    if (method === 'POST' && path === '/auth/logout') return send(route, { ok: true });
    if (method === 'POST' && path === '/auth/refresh') {
      return send(route, {
        accessToken: 'portal-access-refreshed',
        refreshToken: 'portal-refresh-2',
        expiresIn: 900,
        user: USER,
      });
    }

    if (method === 'GET' && path === '/custom-requests') return send(route, [requestSummary(state.quoteState)]);
    if (method === 'GET' && path === '/custom-requests/request-1') {
      return send(route, requestDetail(state.quoteState, state.accepted ? 'booking-1' : null));
    }

    if (method === 'POST' && path === '/quotes/quote-1/accept') {
      const body = request.postDataJSON() as { expectedVersion?: number };
      if (body.expectedVersion !== 7) {
        return route.fulfill({
          status: 409,
          headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
          body: JSON.stringify({ error: { code: 'VERSION_CONFLICT', message: 'This proposal changed.' } }),
        });
      }
      state.quoteState = 'ACCEPTED';
      state.accepted = true;
      return send(route, { bookingId: 'booking-1', reference: REFERENCE }, 201);
    }

    if (method === 'GET' && path === '/quotes/quote-1') return send(route, quote(state.quoteState));

    if (method === 'GET' && path === '/bookings') {
      return send(route, state.accepted ? [bookingSummary(state.captured)] : []);
    }
    if (method === 'GET' && path === '/bookings/booking-1') return send(route, booking(state.captured));
    if (method === 'GET' && path === '/bookings/booking-1/documents') {
      return send(route, state.captured ? booking(true).documents : []);
    }

    if (method === 'GET' && path === '/me/payments') {
      return send(
        route,
        state.captured
          ? [
              {
                id: 'intent-1',
                bookingId: 'booking-1',
                purpose: 'DEPOSIT',
                amountMinor: '102000',
                currency: 'USD',
                state: 'CAPTURED',
                provider: 'mock',
                createdAt: '2026-10-02T10:00:00.000Z',
                postings: [
                  { id: 'posting-1', amountMinor: '102000', currency: 'USD', settledAt: '2026-10-02T10:05:00.000Z' },
                ],
              },
            ]
          : [],
      );
    }

    if (method === 'POST' && path === '/bookings/booking-1/payment-intents') {
      const body = request.postDataJSON() as { purpose?: string; returnPath?: string };
      if (body.purpose !== 'DEPOSIT' || body.returnPath !== '/portal/bookings') {
        return route.fulfill({
          status: 422,
          headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
          body: JSON.stringify({ error: { code: 'VALIDATION_FAILED', message: 'Invalid checkout request.' } }),
        });
      }
      return send(route, paymentIntent('PENDING'), 201);
    }

    if (method === 'POST' && path === '/dev/payment-intents/intent-1/simulate') {
      state.captured = true;
      return send(route, { scenario: 'SUCCESS', ok: true });
    }

    if (method === 'GET' && path === '/payment-intents/intent-1') {
      return send(route, paymentIntent(state.captured ? 'CAPTURED' : 'PENDING'));
    }

    if (method === 'GET' && path === '/documents/document-1/download') {
      const authorization = request.headers()['authorization'];
      if (authorization === 'Bearer portal-access') {
        return route.fulfill({
          status: 401,
          headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
          body: JSON.stringify({ error: { code: 'SESSION_EXPIRED', message: 'Access token expired.' } }),
        });
      }
      return route.fulfill({
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="receipt.pdf"',
        },
        body: '%PDF-1.4 portal receipt',
      });
    }

    return route.fulfill({
      status: 404,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ error: { code: 'NOT_FOUND', message: `No mock for ${method} ${path}` } }),
    });
  });

  return state;
}

test('portal sign-in returns the traveller to the requested travel file page', async ({ page }) => {
  await mockPortal(page);
  await page.goto('/portal/login/?next=/portal/quotes/');

  await page.getByRole('tab', { name: 'Sign in' }).click();
  await page.getByLabel('Email').fill('customer@example.com');
  await page.getByLabel('Password').fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Sign in to my travel file' }).click();

  await expect(page).toHaveURL(/\/portal\/quotes\/$/);
  await expect(page.getByRole('heading', { name: /Your written proposals/i })).toBeVisible();
  await expect(page.getByText('Serengeti & Ngorongoro').first()).toBeVisible();
  await expect(page.getByText('Amina Mwinyi').first()).toBeVisible();
});

test('portal sign-in refuses a next target outside the travel file', async ({ page }) => {
  await mockPortal(page);
  await page.goto('/portal/login/?next=/portalevil/');

  await page.getByLabel('Email').fill('customer@example.com');
  await page.getByLabel('Password').fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Sign in to my travel file' }).click();

  await expect(page).toHaveURL(/\/portal\/$/);
  await expect(page.getByRole('heading', { name: /Karibu/i })).toBeVisible();
});

test('receipt download refreshes an expired access token before saving', async ({ page }) => {
  const state = await mockPortal(page);
  state.quoteState = 'ACCEPTED';
  state.accepted = true;
  state.captured = true;
  await page.addInitScript(() => {
    window.localStorage.setItem('ma.safaris.portal.access', 'portal-access');
    window.localStorage.setItem('ma.safaris.portal.refresh', 'portal-refresh');
  });

  await page.goto('/portal/bookings/?id=booking-1');
  await expect(page.getByText('Payment receipt')).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const saved = await download;
  expect(saved.suggestedFilename()).toBe('receipt.pdf');
  expect(await page.evaluate(() => window.localStorage.getItem('ma.safaris.portal.access'))).toBe(
    'portal-access-refreshed',
  );
});

test('portal proposal acceptance leads into the verified mock deposit checkout', async ({ page }) => {
  const state = await mockPortal(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('ma.safaris.portal.access', 'portal-access');
    window.localStorage.setItem('ma.safaris.portal.refresh', 'portal-refresh');
  });

  await page.goto('/portal/quotes/?request=request-1&id=quote-1');

  await expect(page.getByRole('heading', { name: /Your written proposals/i })).toBeVisible();
  await expect(page.getByText('Proposal v1 · Serengeti & Ngorongoro')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Day by day/ })).toBeVisible();
  await expect(page.getByText('Tented camp · 4 nights')).toBeVisible();

  const accept = page.getByRole('button', { name: 'Accept & reserve' });
  await expect(accept).toBeDisabled();
  await page.getByRole('checkbox').check();
  await accept.click();

  await expect(page.getByText(`Journey reserved — ${REFERENCE}`).first()).toBeVisible();
  await expect(accept).toHaveCount(0);
  expect(state.quoteState).toBe('ACCEPTED');

  await page.getByRole('link', { name: 'Open trip & pay deposit' }).click();
  await expect(page).toHaveURL(/\/portal\/bookings\/\?id=booking-1$/);
  await expect(page.getByRole('heading', { name: /The journey/i })).toBeVisible();
  await expect(page.getByText(REFERENCE).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible();

  await expect(page.getByRole('radio', { name: /Deposit/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: /^Pay / }).click();

  await expect(page.getByText('Development checkout')).toBeVisible();
  await expect(page.getByText(/no real money moves/i)).toBeVisible();
  await page.getByRole('button', { name: 'Simulate successful payment' }).click();

  await expect(page.getByText('A receipt is being prepared below')).toBeVisible();
  await expect(page.getByText('Payment receipt')).toBeVisible();
  await expect(page.getByText('Deposit received').first()).toBeVisible();
  expect(state.captured).toBe(true);

  const afterCapture = await page.evaluate(() => document.body.innerText);
  expect(afterCapture).not.toContain('Simulate successful payment');
});
