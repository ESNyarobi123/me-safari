import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { SnippePaymentAdapter, maskPhone, normalizeTzPhone } from '../packages/backend/src/snippe.js';

if (process.env.NODE_ENV !== 'production') loadEnv({ path: resolve(process.cwd(), '.env'), quiet: true });

const args = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const flag = (name: string) => args.includes(name);

const apiKey = (process.env.SNIPPE_API_KEY ?? '').trim();
const webhookSecret = (process.env.SNIPPE_WEBHOOK_SECRET ?? '').trim();
const baseUrl = (process.env.SNIPPE_BASE_URL ?? 'https://api.snippe.sh').replace(/\/+$/, '');
const timeoutMs = Number(process.env.SNIPPE_HTTP_TIMEOUT_MS ?? 10_000);
const publicApi = (process.env.PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:4000/v1').replace(/\/+$/, '');
const rate = Number(process.env.SNIPPE_TZS_PER_USD ?? 0);

const fail = (message: string): never => {
  console.error(`\n✗ ${message}`);
  process.exit(1);
};
const mask = (value: string) => (value.length <= 10 ? '***' : `${value.slice(0, 6)}…${value.slice(-4)}`);

if (!/^snp_[A-Za-z0-9_]{16,}$/.test(apiKey)) fail('SNIPPE_API_KEY is missing or malformed. Add a real key with collection:create + collection:read scopes.');
if (webhookSecret.length < 32) fail('SNIPPE_WEBHOOK_SECRET is missing or too short. Copy it from Snippe Dashboard → Settings → Webhook Secret.');
if (!/^https?:\/\//.test(baseUrl)) fail('SNIPPE_BASE_URL must be an http(s) origin.');

console.log('Snippe live verification');
console.log(`  API key:      ${mask(apiKey)}`);
console.log(`  Base URL:     ${baseUrl}`);
console.log(`  Webhook URL:  ${publicApi}/webhooks/payments/snippe`);
console.log(`  USD rate:     ${rate > 0 ? `1 USD = ${rate} TZS` : 'NOT SET — USD bookings will be rejected'}`);

// ---------------------------------------------------------------- read access
async function checkReadAccess() {
  const response = await fetch(`${baseUrl}/v1/payments?limit=1`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  let body: { status?: string; data?: unknown; message?: string; error_code?: string } | undefined;
  try {
    body = text ? (JSON.parse(text) as typeof body) : undefined;
  } catch {
    body = undefined;
  }
  if (response.status === 401) fail('Snippe rejected the API key (401). Check that the key is active and belongs to this environment.');
  if (response.status === 403) fail(`Snippe denied read access (403). Create a key with the collection:read scope. ${body?.message ?? ''}`.trim());
  if (!response.ok || body?.status !== 'success') {
    fail(`Read check failed (${response.status}): ${(body?.message ?? text.slice(0, 200)) || 'no response body'}`);
  }
  const count = Array.isArray((body?.data as { items?: unknown[] } | undefined)?.items)
    ? (body?.data as { items: unknown[] }).items.length
    : 0;
  console.log(`\n✓ Credentials and collection:read work (${count} recent payment${count === 1 ? '' : 's'} visible).`);
}

// ------------------------------------------------------- local webhook crypto
function checkWebhookCrypto() {
  const adapter = new SnippePaymentAdapter({} as never, {
    apiKey,
    webhookSecret,
    baseUrl,
    timeoutMs,
    fetchImpl: globalThis.fetch,
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const payload = {
    id: `evt_local_${Date.now()}`,
    type: 'payment.completed',
    api_version: '2026-01-25',
    data: {
      reference: 'local-verification-reference',
      status: 'completed',
      amount: { value: 500, currency: 'TZS' },
      metadata: { intentId: 'local-verification-intent', merchantReference: 'LOCAL-VERIFICATION' },
    },
  };
  const raw = Buffer.from(JSON.stringify(payload));
  const event = adapter.verifyWebhook(raw, adapter.signature(raw, timestamp), timestamp);
  if (!event || event.status !== 'CAPTURED' || event.amountMinor !== '500' || event.currency !== 'TZS') {
    fail('Local HMAC verification failed. Do not use this webhook secret in production.');
  }
  console.log('✓ Webhook HMAC verification works locally (raw-body, timestamp, constant-time compare).');
}

// --------------------------------------------------------------- live charge
async function createLiveCharge() {
  const phone = option('--phone');
  const email = option('--email') ?? process.env.SNIPPE_TEST_EMAIL ?? '';
  const amount = option('--amount') ?? '500';
  const waitSeconds = Math.max(10, Math.min(300, Number(option('--wait') ?? 120)));
  if (!phone) fail('Add --phone 255XXXXXXXXX for the live USSD test.');
  if (!email.includes('@')) fail('Add --email you@example.com (or SNIPPE_TEST_EMAIL) for the provider customer record.');
  if (!/^\d+$/.test(amount) || Number(amount) < 500) fail('The provider minimum is 500 TZS. Use --amount 500 or more.');
  if (!flag('--yes')) {
    console.log(`\nReady to send a real TZS ${amount} USSD prompt to ${maskPhone(normalizeTzPhone(phone))}.`);
    console.log('Nothing was sent. Re-run with --yes to create the payment, then approve the prompt on that phone.');
    console.log('If the owner approves, real money moves and Snippe has no API refund; reversal is manual.');
    return;
  }

  const adapter = new SnippePaymentAdapter({} as never, {
    apiKey,
    webhookSecret,
    baseUrl,
    timeoutMs,
    fetchImpl: globalThis.fetch,
  });
  const reference = `CHK-${Date.now().toString(36).toUpperCase()}`;
  console.log(`\n→ Creating a TZS ${amount} mobile-money payment for ${maskPhone(normalizeTzPhone(phone))} …`);
  const result = await adapter.createIntent({
    id: '00000000-0000-4000-8000-000000000000',
    merchantReference: reference,
    amountMinor: BigInt(amount) * 100n,
    currency: 'TZS',
    customer: { name: 'Snippe Verification', email, phone },
    webhookUrl: `${publicApi}/webhooks/payments/snippe`,
  });
  console.log(`✓ Payment created: ${result.providerTransactionId}`);
  console.log(`  Provider amount: ${result.providerAmountMinor} ${result.providerCurrency}`);
  console.log('  Approve the USSD prompt on the phone. Polling status …');

  const started = Date.now();
  let last = '';
  while (Date.now() - started < waitSeconds * 1000) {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    const response = await fetch(`${baseUrl}/v1/payments/${encodeURIComponent(result.providerTransactionId ?? '')}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = (await response.json().catch(() => undefined)) as { status?: string; data?: { status?: string; amount?: { value?: number } } } | undefined;
    const state = String(body?.data?.status ?? 'unknown');
    if (state !== last) {
      console.log(`  ${new Date().toISOString()}  status=${state}  amount=${body?.data?.amount?.value ?? '?'} TZS`);
      last = state;
    }
    if (['completed', 'failed', 'voided', 'expired'].includes(state)) {
      if (state === 'completed') {
        console.log('✓ Provider reports completed. Confirm the signed webhook reached the API and the intent was captured.');
      } else {
        console.log(`✗ Provider reported ${state}. No capture should be posted.`);
      }
      return;
    }
  }
  console.log(`⚠ No terminal status after ${waitSeconds}s. The intent may still settle; check the dashboard and reconciliation.`);
}

async function main() {
  await checkReadAccess();
  checkWebhookCrypto();
  const phone = option('--phone');
  if (phone || flag('--charge')) await createLiveCharge();
  else {
    console.log('\nNo live USSD prompt was sent. To test the full flow, re-run with:');
    console.log('  npm run verify:snippe -- --phone 255XXXXXXXXX --email you@example.com --yes');
  }
  console.log('\nLocal checks passed. A real webhook delivery still needs one approved payment or the Snippe webhook simulator.');
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
