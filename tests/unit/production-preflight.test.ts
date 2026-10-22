import { describe, expect, it } from '@jest/globals';
import {
  evaluateProductionEnv,
  exitCode,
  summarize,
  type CheckResult,
} from '../../scripts/production-preflight-lib.js';

const productionEnv = {
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: 'a'.repeat(64),
  MOCK_WEBHOOK_SECRET: 'b'.repeat(64),
  DATABASE_URL: 'postgresql://app:secret@db.internal:5432/ma_safaris',
  REDIS_URL: 'redis://cache.internal:6379',
  PUBLIC_API_BASE_URL: 'https://api.ma-safaris.test/v1',
  PUBLIC_WEB_URL: 'https://www.ma-safaris.test',
  ALLOWED_WEB_ORIGINS: 'https://www.ma-safaris.test',
  ENABLE_DEV_PAYMENT_SIMULATION: 'false',
  PAYMENT_PROVIDER: 'disabled',
  STORAGE_DRIVER: 's3',
  PUSH_PROVIDER: 'expo',
  SMTP_HOST: 'smtp.mailprovider.test',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_FROM: 'M&A Safaris <no-reply@ma-safaris.test>',
  API_HOST: '127.0.0.1',
};

const level = (results: CheckResult[], id: string) => results.find((result) => result.id === id)?.level;

describe('production preflight', () => {
  it('accepts a hardened environment while still reporting the known launch blockers', () => {
    const results = evaluateProductionEnv(productionEnv);
    expect(results.filter((result) => result.level === 'fail')).toEqual([]);
    expect(results.filter((result) => result.level === 'blocked').map((result) => result.id).sort()).toEqual([
      'PAYMENT_PROVIDER',
      'STORAGE_DRIVER',
    ]);
    expect(exitCode(results)).toBe(1);
  });

  it('passes the payment gate only when Snippe credentials are complete', () => {
    const snippe = {
      ...productionEnv,
      PAYMENT_PROVIDER: 'snippe',
      SNIPPE_API_KEY: `snp_${'a'.repeat(40)}`,
      SNIPPE_WEBHOOK_SECRET: `whsec_${'b'.repeat(64)}`,
      SNIPPE_BASE_URL: 'https://api.snippe.sh',
      SNIPPE_TZS_PER_USD: '2600',
    };
    const ready = evaluateProductionEnv(snippe);
    expect(level(ready, 'PAYMENT_PROVIDER')).toBe('pass');
    expect(level(ready, 'SNIPPE_API_KEY')).toBe('pass');
    expect(level(ready, 'SNIPPE_WEBHOOK_SECRET')).toBe('pass');
    expect(level(ready, 'SNIPPE_TZS_PER_USD')).toBe('pass');
    expect(ready.filter((result) => result.level === 'fail')).toEqual([]);

    const missing = evaluateProductionEnv({ ...snippe, SNIPPE_API_KEY: '' });
    expect(level(missing, 'SNIPPE_API_KEY')).toBe('fail');
    expect(level(missing, 'PAYMENT_PROVIDER')).toBe('pass');

    const noRate = evaluateProductionEnv({ ...snippe, SNIPPE_TZS_PER_USD: '' });
    expect(level(noRate, 'SNIPPE_TZS_PER_USD')).toBe('fail');
  });

  it('rejects development payment simulation, HTTP origins, local SMTP and placeholder secrets', () => {
    const results = evaluateProductionEnv({
      ...productionEnv,
      ENABLE_DEV_PAYMENT_SIMULATION: 'true',
      PUBLIC_API_BASE_URL: 'http://127.0.0.1:4000/v1',
      PUBLIC_WEB_URL: 'http://localhost:3000',
      ALLOWED_WEB_ORIGINS: '*',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '1025',
      SMTP_FROM: 'M&A Safaris Development <noreply@ma-safaris.local>',
      JWT_ACCESS_SECRET: 'GENERATE_RANDOM_LOCAL_SECRET',
      API_HOST: '0.0.0.0',
      TRUST_PROXY: '*',
    });

    for (const id of [
      'ENABLE_DEV_PAYMENT_SIMULATION',
      'PUBLIC_API_BASE_URL',
      'PUBLIC_WEB_URL',
      'ALLOWED_WEB_ORIGINS',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_FROM',
      'JWT_ACCESS_SECRET',
      'TRUST_PROXY',
    ]) {
      expect(level(results, id)).toBe('fail');
    }
    expect(level(results, 'API_HOST')).toBe('warn');
  });

  it('requires the API base URL to include /v1 and NODE_ENV to be production', () => {
    const results = evaluateProductionEnv({
      ...productionEnv,
      NODE_ENV: 'staging',
      PUBLIC_API_BASE_URL: 'https://api.ma-safaris.test',
    });
    expect(level(results, 'NODE_ENV')).toBe('fail');
    expect(level(results, 'PUBLIC_API_BASE_URL_PATH')).toBe('fail');
  });

  it('rejects origins with trailing slashes and web URLs with paths', () => {
    const results = evaluateProductionEnv({
      ...productionEnv,
      ALLOWED_WEB_ORIGINS: 'https://www.ma-safaris.test/',
      PUBLIC_WEB_URL: 'https://www.ma-safaris.test/portal',
    });
    expect(level(results, 'ALLOWED_WEB_ORIGINS')).toBe('fail');
    expect(level(results, 'PUBLIC_WEB_URL_ORIGIN')).toBe('fail');
  });

  it('rejects reserved example domains in production URLs and mail settings', () => {
    const results = evaluateProductionEnv({
      ...productionEnv,
      PUBLIC_WEB_URL: 'https://app.example.com',
      SMTP_HOST: 'smtp.provider.example',
      SMTP_FROM: 'M&A Safaris <no-reply@example.com>',
    });
    expect(level(results, 'PUBLIC_WEB_URL')).toBe('fail');
    expect(level(results, 'SMTP_HOST')).toBe('fail');
    expect(level(results, 'SMTP_FROM')).toBe('fail');
  });

  it('accepts TLS Redis and rejects malformed SMTP transport values', () => {
    const results = evaluateProductionEnv({
      ...productionEnv,
      REDIS_URL: 'rediss://cache.internal:6379',
      SMTP_PORT: '',
      SMTP_SECURE: 'maybe',
      SMTP_FROM: '',
      API_HOST: '',
    });
    expect(results.filter((result) => result.id === 'REDIS_URL')[0].level).toBe('pass');
    expect(level(results, 'SMTP_PORT')).toBe('fail');
    expect(level(results, 'SMTP_SECURE')).toBe('fail');
    expect(level(results, 'SMTP_FROM')).toBe('fail');
    expect(level(results, 'API_HOST')).toBe('warn');
  });

  it('summarizes levels and only fails the gate for failures or launch blockers', () => {
    expect(exitCode([{ id: 'warn', level: 'warn', detail: '' }])).toBe(0);
    expect(summarize([
      { id: 'a', level: 'pass', detail: '' },
      { id: 'b', level: 'warn', detail: '' },
      { id: 'c', level: 'fail', detail: '' },
      { id: 'd', level: 'blocked', detail: '' },
    ])).toEqual({ pass: 1, warn: 1, fail: 1, blocked: 1 });
  });
});
