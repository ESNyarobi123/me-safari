import { describe, expect, it, jest } from '@jest/globals';
import { SnippePaymentAdapter, maskPhone, normalizeTzPhone } from '../../packages/backend/src/snippe.js';

const options = {
  apiKey: `snp_${'a'.repeat(40)}`,
  webhookSecret: `whsec_${'b'.repeat(64)}`,
  baseUrl: 'https://api.snippe.sh',
  timeoutMs: 5000,
};

const intent = {
  id: '11111111-1111-4111-8111-111111111111',
  merchantReference: 'PAY-2026-ABCDEF123456',
  amountMinor: 50000n,
  currency: 'TZS',
  customer: { name: 'Amina Hassan', email: 'amina@ma-safaris.test', phone: '+255 712 345 678' },
  webhookUrl: 'https://api.ma-safaris.test/v1/webhooks/payments/snippe',
};

function adapter(fetchImpl: typeof fetch, db: unknown = {}) {
  return new SnippePaymentAdapter(db as never, { ...options, fetchImpl });
}

function envelope(data: unknown, status = 200) {
  return new Response(JSON.stringify({ status: 'success', code: status, data }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Snippe payment adapter', () => {
  it('normalises Tanzanian mobile numbers and never stores the raw number in nextAction', () => {
    expect(normalizeTzPhone('0712 345 678')).toBe('255712345678');
    expect(normalizeTzPhone('+255 712 345 678')).toBe('255712345678');
    expect(normalizeTzPhone('712345678')).toBe('255712345678');
    expect(() => normalizeTzPhone('020 123 4567')).toThrow(/Tanzanian mobile/i);
    expect(maskPhone('255712345678')).toBe('712•••678');
  });

  it('creates a mobile-money payment with the merchant reference as idempotency key', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return envelope({
        reference: '9015c155-9e29-4e8e-8fe6-d5d81553c8e6',
        status: 'pending',
        expires_at: new Date(Date.now() + 4 * 3600_000).toISOString(),
        amount: { value: 500, currency: 'TZS' },
      }, 201);
    }) as unknown as typeof fetch;

    const result = await adapter(fetchImpl).createIntent(intent);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.snippe.sh/v1/payments');
    expect(calls[0].init.method).toBe('POST');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${options.apiKey}`);
    expect(headers['Idempotency-Key']).toBe(intent.merchantReference);
    const body = JSON.parse(String(calls[0].init.body));
    expect(body).toMatchObject({
      payment_type: 'mobile',
      details: { amount: 500, currency: 'TZS' },
      phone_number: '255712345678',
      customer: { firstname: 'Amina', lastname: 'Hassan', email: 'amina@ma-safaris.test' },
      webhook_url: intent.webhookUrl,
      metadata: { intentId: intent.id, merchantReference: intent.merchantReference },
    });
    expect(result.providerTransactionId).toBe('9015c155-9e29-4e8e-8fe6-d5d81553c8e6');
    expect(result.providerAmountMinor).toBe('500');
    expect(result.nextAction?.phone).toBe('712•••678');
    expect(String(result.nextAction?.instructions)).not.toContain('712345678');
    expect(String(result.nextAction?.instructions)).toContain('TZS 500');
  });

  it('converts a USD booking at the frozen approved rate and discloses both amounts', async () => {
    const calls: Array<{ body: string }> = [];
    const fetchImpl = jest.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      calls.push({ body: String(init?.body) });
      return envelope({ reference: 'ref-usd', status: 'pending' }, 201);
    }) as unknown as typeof fetch;

    const result = await adapter(fetchImpl).createIntent({ ...intent, amountMinor: 102000n, currency: 'USD', fxRate: '2600' });
    expect(JSON.parse(calls[0].body).details).toEqual({ amount: 2652000, currency: 'TZS' });
    expect(result.providerAmountMinor).toBe('2652000');
    expect(result.providerCurrency).toBe('TZS');
    expect(result.ledgerAmountMinor).toBe('102000');
    expect(result.ledgerCurrency).toBe('USD');
    expect(result.fxRate).toBe('2600');
    expect(result.nextAction).toMatchObject({
      amount: { currency: 'TZS', minor: '2652000' },
      ledgerAmount: { currency: 'USD', minor: '102000' },
      fxRate: '2600',
    });
    expect(String(result.nextAction?.instructions)).toContain('TZS 2,652,000');
    expect(String(result.nextAction?.instructions)).toContain('USD 1,020.00 at 1 USD = 2600 TZS');
  });

  it('fails closed for USD without a rate and for fractional shilling amounts', async () => {
    await expect(adapter(jest.fn() as unknown as typeof fetch).createIntent({ ...intent, amountMinor: 102000n, currency: 'USD' })).rejects.toThrow(/TZS-per-USD/i);
    await expect(adapter(jest.fn() as unknown as typeof fetch).createIntent({ ...intent, amountMinor: 50050n })).rejects.toThrow(/whole Tanzanian shilling/i);
  });

  it('rejects amounts below the provider minimum and missing customer data', async () => {
    const fetchImpl = jest.fn() as unknown as typeof fetch;
    await expect(adapter(fetchImpl).createIntent({ ...intent, amountMinor: 100n })).rejects.toThrow(/500 TZS/i);
    await expect(adapter(fetchImpl).createIntent({ ...intent, customer: { ...intent.customer, email: '' } })).rejects.toThrow(/email/i);
    await expect(adapter(fetchImpl).createIntent({ ...intent, customer: { ...intent.customer, phone: '123' } })).rejects.toThrow(/Tanzanian mobile/i);
  });

  it('retries a transient provider outage and surfaces validation errors', async () => {
    const fetchImpl = jest.fn(async () => new Response(JSON.stringify({ status: 'error', code: 503, message: 'unavailable' }), { status: 503 })) as unknown as typeof fetch;
    await expect(adapter(fetchImpl).createIntent(intent)).rejects.toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE', details: { ambiguous: true } });
    expect((fetchImpl as unknown as jest.Mock).mock.calls).toHaveLength(3);

    const invalid = jest.fn(async () => new Response(JSON.stringify({ status: 'error', code: 400, message: 'phone_number must be a valid phone number' }), { status: 400 })) as unknown as typeof fetch;
    await expect(adapter(invalid).createIntent(intent)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });

    const wrongAmount = jest.fn(async () => envelope({ reference: 'ref-wrong', amount: { value: 501, currency: 'TZS' } }, 201)) as unknown as typeof fetch;
    await expect(adapter(wrongAmount).createIntent(intent)).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_ERROR', details: { ambiguous: true, providerReference: 'ref-wrong' } });

    const noReference = jest.fn(async () => envelope({ status: 'pending' }, 201)) as unknown as typeof fetch;
    await expect(adapter(noReference).createIntent(intent)).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_ERROR', details: { ambiguous: true } });
  });

  it('verifies the HMAC-SHA256 webhook signature, rejects replay and normalises payment events', () => {
    const instance = adapter(jest.fn() as unknown as typeof fetch);
    const payload = {
      id: 'evt_a1b2c3d4e5f6',
      type: 'payment.completed',
      api_version: '2026-01-25',
      created_at: new Date().toISOString(),
      data: {
        reference: '9015c155-9e29-4e8e-8fe6-d5d81553c8e6',
        status: 'completed',
        amount: { value: 50000, currency: 'TZS' },
        metadata: { intentId: intent.id, merchantReference: intent.merchantReference },
      },
    };
    const raw = Buffer.from(JSON.stringify(payload));
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = instance.signature(raw, timestamp);
    const event = instance.verifyWebhook(raw, signature, timestamp);
    expect(event).toMatchObject({
      eventId: 'evt_a1b2c3d4e5f6',
      intentId: intent.id,
      merchantReference: intent.merchantReference,
      amountMinor: '50000',
      currency: 'TZS',
      status: 'CAPTURED',
      providerReference: '9015c155-9e29-4e8e-8fe6-d5d81553c8e6',
    });

    expect(() => instance.verifyWebhook(raw, signature, String(Number(timestamp) - 3600))).toThrow(/Invalid payment event/i);
    expect(() => instance.verifyWebhook(raw, '00'.repeat(32), timestamp)).toThrow(/Invalid payment event/i);
  });

  it('acknowledges non-payment events without turning them into captures', () => {
    const instance = adapter(jest.fn() as unknown as typeof fetch);
    const raw = Buffer.from(JSON.stringify({ id: 'evt_payout', type: 'payout.completed', data: { reference: 'payout_1' } }));
    const timestamp = String(Math.floor(Date.now() / 1000));
    expect(instance.verifyWebhook(raw, instance.signature(raw, timestamp), timestamp)).toBeNull();
  });

  it('queries settlement status using the stored provider reference', async () => {
    const calls: string[] = [];
    const fetchImpl = jest.fn(async (url: string | URL | Request) => {
      calls.push(String(url));
      return envelope({ reference: 'ref-1', status: 'completed', amount: { value: 50000, currency: 'TZS' } });
    }) as unknown as typeof fetch;
    const db = {
      paymentIntent: {
        findUnique: async () => ({
          id: intent.id,
          merchantReference: intent.merchantReference,
          currency: 'TZS',
          attempts: [{ providerTransactionId: 'ref-1' }],
        }),
      },
    };
    const event = await adapter(fetchImpl, db).queryStatus(intent.id);
    expect(calls[0]).toBe('https://api.snippe.sh/v1/payments/ref-1');
    expect(event).toMatchObject({ status: 'CAPTURED', amountMinor: '50000', intentId: intent.id });
  });
});
