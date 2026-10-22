/**
 * Production configuration preflight.
 *
 * Pure environment checks live here so they can be unit tested without a
 * database, Redis, secrets or a production host. The CLI wrapper in
 * `production-preflight.ts` adds filesystem and connectivity checks.
 */

export type CheckLevel = 'pass' | 'warn' | 'fail' | 'blocked';

export interface CheckResult {
  id: string;
  level: CheckLevel;
  detail: string;
}

type Env = Record<string, string | undefined>;

const PLACEHOLDER = /GENERATE|CHANGE_|SET_A_|CHANGEME|REPLACE_|example\.com/i;
const PLACEHOLDER_HOST = /(^|\.)example(?:\.(?:com|net|org))?$/i;
const LOOPBACK = /(^|[/:@])(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)([:/]|$)/i;

const value = (env: Env, key: string) => env[key]?.trim() ?? '';

function isPlaceholderHost(host: string): boolean {
  return PLACEHOLDER_HOST.test(host.toLowerCase().replace(/^\[|\]$/g, ''));
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === 'localhost'
    || normalized === '::1'
    || normalized === '0.0.0.0'
    || /^127(?:\.\d{1,3}){3}$/.test(normalized);
}

function isExplicitHttpsOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:'
      && url.origin === origin
      && !url.username
      && !url.password
      && !isLoopbackHost(url.hostname)
      && !isPlaceholderHost(url.hostname);
  } catch {
    return false;
  }
}

function secret(env: Env, key: string, results: CheckResult[]) {
  const current = value(env, key);
  if (!current) {
    results.push({ id: key, level: 'fail', detail: 'is required.' });
    return;
  }
  if (current.trim().length < 32 || PLACEHOLDER.test(current)) {
    results.push({ id: key, level: 'fail', detail: 'must be a random value of at least 32 characters, not a placeholder.' });
    return;
  }
  results.push({ id: key, level: 'pass', detail: 'is set with sufficient length.' });
}

function httpsUrl(env: Env, key: string, results: CheckResult[]) {
  const current = value(env, key);
  if (!current) {
    results.push({ id: key, level: 'fail', detail: 'is required.' });
    return;
  }
  if (!current.startsWith('https://')) {
    results.push({ id: key, level: 'fail', detail: 'must use HTTPS in production.' });
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(current);
  } catch {
    results.push({ id: key, level: 'fail', detail: 'is not a valid URL.' });
    return;
  }
  if (isLoopbackHost(parsed.hostname)) {
    results.push({ id: key, level: 'fail', detail: 'must not point at a loopback host in production.' });
    return;
  }
  if (isPlaceholderHost(parsed.hostname)) {
    results.push({ id: key, level: 'fail', detail: 'must not use a reserved example/placeholder domain.' });
    return;
  }
  if (parsed.username || parsed.password) {
    results.push({ id: key, level: 'fail', detail: 'must not embed credentials.' });
    return;
  }
  results.push({ id: key, level: 'pass', detail: 'is an HTTPS public URL.' });
}

function serviceUrl(env: Env, key: string, results: CheckResult[]) {
  const current = value(env, key);
  if (!current) {
    results.push({ id: key, level: 'fail', detail: 'is required.' });
    return;
  }
  if (!/^(postgres(ql)?|rediss?):\/\//.test(current)) {
    results.push({ id: key, level: 'fail', detail: 'has an unexpected scheme.' });
    return;
  }
  results.push({
    id: key,
    level: LOOPBACK.test(current) ? 'warn' : 'pass',
    detail: LOOPBACK.test(current)
      ? 'points at a loopback/container host; confirm this is intentional on the production host.'
      : 'is configured for a private or managed service.',
  });
}

export function evaluateProductionEnv(env: Env): CheckResult[] {
  const results: CheckResult[] = [];

  results.push({
    id: 'NODE_ENV',
    level: value(env, 'NODE_ENV') === 'production' ? 'pass' : 'fail',
    detail: value(env, 'NODE_ENV') === 'production'
      ? 'is production.'
      : 'must be exactly "production" for a release preflight.',
  });

  secret(env, 'JWT_ACCESS_SECRET', results);
  const selectedProvider = value(env, 'PAYMENT_PROVIDER');
  if (selectedProvider === 'snippe') {
    const apiKey = value(env, 'SNIPPE_API_KEY');
    results.push({
      id: 'SNIPPE_API_KEY',
      level: /^snp_[A-Za-z0-9_]{16,}$/.test(apiKey) && !PLACEHOLDER.test(apiKey) ? 'pass' : 'fail',
      detail: /^snp_[A-Za-z0-9_]{16,}$/.test(apiKey) && !PLACEHOLDER.test(apiKey)
        ? 'is a Snippe API key.'
        : 'must be the Snippe API key created with collection:create and collection:read scopes.',
    });
    secret(env, 'SNIPPE_WEBHOOK_SECRET', results);
    const rate = value(env, 'SNIPPE_TZS_PER_USD');
    results.push({
      id: 'SNIPPE_TZS_PER_USD',
      level: /^\d{1,6}(?:\.\d{1,4})?$/.test(rate) && Number(rate) > 0 ? 'pass' : 'fail',
      detail: /^\d{1,6}(?:\.\d{1,4})?$/.test(rate) && Number(rate) > 0
        ? 'is the approved TZS-per-USD rate for USD bookings.'
        : 'must be a positive approved TZS-per-USD rate (max four decimals); USD bookings cannot be collected without it.',
    });
    if (value(env, 'SNIPPE_BASE_URL')) {
      httpsUrl(env, 'SNIPPE_BASE_URL', results);
    } else {
      results.push({ id: 'SNIPPE_BASE_URL', level: 'pass', detail: 'defaults to https://api.snippe.sh.' });
    }
  } else if (selectedProvider === 'mock') {
    secret(env, 'MOCK_WEBHOOK_SECRET', results);
  }

  serviceUrl(env, 'DATABASE_URL', results);
  serviceUrl(env, 'REDIS_URL', results);

  httpsUrl(env, 'PUBLIC_API_BASE_URL', results);
  httpsUrl(env, 'PUBLIC_WEB_URL', results);

  const apiBase = value(env, 'PUBLIC_API_BASE_URL');
  let apiUrl: URL | undefined;
  try {
    apiUrl = apiBase ? new URL(apiBase) : undefined;
  } catch {
    apiUrl = undefined;
  }
  const apiPathOk = Boolean(apiUrl)
    && apiUrl!.pathname.endsWith('/v1')
    && !apiUrl!.search
    && !apiUrl!.hash;
  results.push({
    id: 'PUBLIC_API_BASE_URL_PATH',
    level: apiPathOk ? 'pass' : 'fail',
    detail: apiPathOk
      ? 'ends with /v1 and contains no query or fragment.'
      : 'must end with /v1 and contain no query or fragment so portal, SDK and mobile clients share one base contract.',
  });

  const webUrl = value(env, 'PUBLIC_WEB_URL');
  let webBareOrigin = false;
  try {
    const parsed = webUrl ? new URL(webUrl) : undefined;
    webBareOrigin = Boolean(parsed)
      && parsed!.origin === webUrl
      && parsed!.pathname === '/'
      && !parsed!.search
      && !parsed!.hash;
  } catch {
    webBareOrigin = false;
  }
  results.push({
    id: 'PUBLIC_WEB_URL_ORIGIN',
    level: webBareOrigin ? 'pass' : 'fail',
    detail: webBareOrigin
      ? 'is a bare HTTPS origin.'
      : 'must be a bare HTTPS origin (no path, query, fragment or trailing slash) because portal links append their own path.',
  });

  const origins = value(env, 'ALLOWED_WEB_ORIGINS').split(',').map((origin) => origin.trim()).filter(Boolean);
  if (!origins.length) {
    results.push({ id: 'ALLOWED_WEB_ORIGINS', level: 'fail', detail: 'must list the exact public web origin(s).' });
  } else if (origins.some((origin) => !isExplicitHttpsOrigin(origin))) {
    results.push({
      id: 'ALLOWED_WEB_ORIGINS',
      level: 'fail',
      detail: 'must contain only explicit HTTPS public origins with no path, trailing slash, wildcard, HTTP or loopback.',
    });
  } else {
    results.push({ id: 'ALLOWED_WEB_ORIGINS', level: 'pass', detail: `lists ${origins.length} explicit HTTPS origin(s).` });
  }

  results.push({
    id: 'ENABLE_DEV_PAYMENT_SIMULATION',
    level: value(env, 'ENABLE_DEV_PAYMENT_SIMULATION') === 'true' ? 'fail' : 'pass',
    detail: value(env, 'ENABLE_DEV_PAYMENT_SIMULATION') === 'true'
      ? 'must not be enabled in production.'
      : 'is not enabled.',
  });

  const provider = value(env, 'PAYMENT_PROVIDER');
  results.push({
    id: 'PAYMENT_PROVIDER',
    level: provider === 'snippe' ? 'pass' : provider === 'mock' || provider === 'disabled' || !provider ? 'blocked' : 'fail',
    detail: provider === 'snippe'
      ? 'Snippe mobile-money collections are selected; confirm the merchant account is live before launch.'
      : provider === 'mock'
        ? 'The development mock must never collect real money.'
        : provider === 'disabled'
          ? 'No payment provider is selected; travellers cannot pay.'
          : 'PAYMENT_PROVIDER must be "snippe" (or "disabled" during maintenance).',
  });

  const storage = value(env, 'STORAGE_DRIVER');
  if (storage !== 'local' && storage !== 's3') {
    results.push({ id: 'STORAGE_DRIVER', level: 'fail', detail: 'must be "local" or "s3".' });
  } else {
    results.push({
      id: 'STORAGE_DRIVER',
      level: 'blocked',
      detail: storage === 's3'
        ? 'An S3-compatible private storage adapter is not implemented yet; the database/private-file backup path must be proven first.'
        : 'Local private storage is development-only; production requires private object storage, encryption and malware scanning.',
    });
  }

  const push = value(env, 'PUSH_PROVIDER');
  results.push({
    id: 'PUSH_PROVIDER',
    level: push === 'expo' ? 'pass' : 'warn',
    detail: push === 'expo' ? 'Expo push delivery is selected.' : 'Push is disabled; portal notifications remain in-app/email only.',
  });

  const smtpHost = value(env, 'SMTP_HOST');
  if (!smtpHost) {
    results.push({ id: 'SMTP_HOST', level: 'fail', detail: 'is required for invitation and receipt email.' });
  } else if (isLoopbackHost(smtpHost)) {
    results.push({ id: 'SMTP_HOST', level: 'fail', detail: 'must not be a local Mailpit/loopback host in production.' });
  } else if (isPlaceholderHost(smtpHost)) {
    results.push({ id: 'SMTP_HOST', level: 'fail', detail: 'must not use a reserved example/placeholder domain.' });
  } else {
    results.push({ id: 'SMTP_HOST', level: 'pass', detail: 'is a remote SMTP host.' });
  }

  const smtpPort = Number(value(env, 'SMTP_PORT'));
  const smtpSecure = value(env, 'SMTP_SECURE');
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    results.push({ id: 'SMTP_PORT', level: 'fail', detail: 'must be a valid TCP port.' });
  } else if (smtpPort === 1025) {
    results.push({ id: 'SMTP_PORT', level: 'fail', detail: 'port 1025 is the development Mailpit port.' });
  } else {
    results.push({ id: 'SMTP_TRANSPORT', level: 'pass', detail: 'SMTP transport is not using known development defaults.' });
  }
  if (smtpSecure !== 'true' && smtpSecure !== 'false') {
    results.push({ id: 'SMTP_SECURE', level: 'fail', detail: 'must be "true" or "false".' });
  } else if (smtpPort === 465 && smtpSecure !== 'true') {
    results.push({ id: 'SMTP_SECURE', level: 'fail', detail: 'port 465 requires SMTP_SECURE=true.' });
  }

  const smtpFrom = value(env, 'SMTP_FROM');
  if (!smtpFrom || !smtpFrom.includes('@')) {
    results.push({ id: 'SMTP_FROM', level: 'fail', detail: 'must be a configured sender address.' });
  } else if (/development|ma-safaris\.local|(?:^|[.@])example(?:\.|$)/i.test(smtpFrom)) {
    results.push({ id: 'SMTP_FROM', level: 'fail', detail: 'must use an approved sender domain, not a development or reserved example domain.' });
  } else {
    results.push({ id: 'SMTP_FROM', level: 'pass', detail: 'uses a configured sender.' });
  }

  if (value(env, 'SEED_DEMO_PASSWORD')) {
    results.push({ id: 'SEED_DEMO_PASSWORD', level: 'warn', detail: 'should be removed after seeding; demo identities must not exist in production.' });
  } else {
    results.push({ id: 'SEED_DEMO_PASSWORD', level: 'pass', detail: 'is not set.' });
  }

  const trustProxy = value(env, 'TRUST_PROXY');
  if (!trustProxy) {
    results.push({ id: 'TRUST_PROXY', level: 'pass', detail: 'uses the safe loopback proxy default.' });
  } else if (trustProxy.split(',').some((part) => ['*', 'true', '0.0.0.0/0', '::/0'].includes(part.trim()))) {
    results.push({ id: 'TRUST_PROXY', level: 'fail', detail: 'must name the reverse proxy address, not trust every peer.' });
  } else {
    results.push({ id: 'TRUST_PROXY', level: 'pass', detail: 'trusts the configured proxy address(es).' });
  }

  const apiHost = value(env, 'API_HOST');
  if (!apiHost || apiHost === '0.0.0.0' || apiHost === '::') {
    results.push({ id: 'API_HOST', level: 'warn', detail: 'binds all interfaces (default); bind loopback when a reverse proxy runs on the same host.' });
  } else if (isLoopbackHost(apiHost)) {
    results.push({ id: 'API_HOST', level: 'pass', detail: 'is bound to loopback; publish it only through the reverse proxy.' });
  } else {
    results.push({ id: 'API_HOST', level: 'pass', detail: 'is bound to a specific interface.' });
  }

  return results;
}

export function summarize(results: CheckResult[]) {
  return {
    pass: results.filter((result) => result.level === 'pass').length,
    warn: results.filter((result) => result.level === 'warn').length,
    fail: results.filter((result) => result.level === 'fail').length,
    blocked: results.filter((result) => result.level === 'blocked').length,
  };
}

export function exitCode(results: CheckResult[]): number {
  return results.some((result) => result.level === 'fail' || result.level === 'blocked') ? 1 : 0;
}
