import { describe, expect, it } from '@jest/globals';
import { parseConfig } from '../../packages/backend/src/config.js';

const production = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://app:secret@db.internal:5432/ma_safaris',
  REDIS_URL: 'redis://cache.internal:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(64),
  MOCK_WEBHOOK_SECRET: 'b'.repeat(64),
  PUBLIC_API_BASE_URL: 'https://api.ma-safaris.test/v1',
  PUBLIC_WEB_URL: 'https://www.ma-safaris.test',
  ALLOWED_WEB_ORIGINS: 'https://www.ma-safaris.test',
  PAYMENT_PROVIDER: 'disabled',
  ENABLE_DEV_PAYMENT_SIMULATION: 'false',
  STORAGE_DRIVER: 'local',
  LOCAL_PRIVATE_STORAGE_PATH: '/var/lib/ma-safaris/private-storage',
  SMTP_HOST: 'smtp.mailprovider.test',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_FROM: 'M&A Safaris <no-reply@ma-safaris.test>',
};

describe('production configuration guards', () => {
  it('accepts a non-payment production baseline', () => {
    const parsed = parseConfig(production);
    expect(parsed.NODE_ENV).toBe('production');
    expect(parsed.PUBLIC_WEB_URL).toBe('https://www.ma-safaris.test');
  });

  it('rejects the mock provider and development simulation', () => {
    expect(() => parseConfig({ ...production, PAYMENT_PROVIDER: 'mock' })).toThrow(/development payment adapter/i);
    expect(() => parseConfig({ ...production, ENABLE_DEV_PAYMENT_SIMULATION: 'true' })).toThrow(/payment adapter or simulation/i);
  });

  it('rejects placeholder secrets', () => {
    expect(() => parseConfig({ ...production, JWT_ACCESS_SECRET: `GENERATE_${'a'.repeat(60)}` })).toThrow(/Placeholder/i);
  });

  it('accepts Snippe only with a real API key and webhook signing key', () => {
    const snippe = { ...production, PAYMENT_PROVIDER: 'snippe', SNIPPE_API_KEY: `snp_${'a'.repeat(40)}`, SNIPPE_WEBHOOK_SECRET: `whsec_${'b'.repeat(64)}`, SNIPPE_TZS_PER_USD: '2600' };
    expect(parseConfig(snippe).PAYMENT_PROVIDER).toBe('snippe');
    expect(parseConfig(snippe).SNIPPE_TZS_PER_USD).toBe(2600);
    expect(() => parseConfig({ ...snippe, SNIPPE_API_KEY: '' })).toThrow(/SNIPPE_API_KEY/i);
    expect(() => parseConfig({ ...snippe, SNIPPE_API_KEY: 'GENERATE_SNIPPE_KEY' })).toThrow(/SNIPPE_API_KEY/i);
    expect(() => parseConfig({ ...snippe, SNIPPE_WEBHOOK_SECRET: 'short' })).toThrow(/SNIPPE_WEBHOOK_SECRET/i);
    expect(() => parseConfig({ ...snippe, SNIPPE_BASE_URL: 'http://api.snippe.sh' })).toThrow(/SNIPPE_BASE_URL/i);
    expect(() => parseConfig({ ...snippe, SNIPPE_TZS_PER_USD: '0' })).toThrow(/SNIPPE_TZS_PER_USD/i);
    expect(() => parseConfig({ ...snippe, SNIPPE_TZS_PER_USD: '2600.12345' })).toThrow(/SNIPPE_TZS_PER_USD/i);
  });

  it('requires HTTPS API and web URLs', () => {
    expect(() => parseConfig({ ...production, PUBLIC_API_BASE_URL: 'http://api.example.test/v1' })).toThrow(/HTTPS API/i);
    expect(() => parseConfig({ ...production, PUBLIC_WEB_URL: 'http://www.example.test' })).toThrow(/HTTPS customer web/i);
  });

  it('rejects wildcard, HTTP and loopback CORS origins', () => {
    expect(() => parseConfig({ ...production, ALLOWED_WEB_ORIGINS: '*' })).toThrow(/CORS/i);
    expect(() => parseConfig({ ...production, ALLOWED_WEB_ORIGINS: 'http://www.ma-safaris.test' })).toThrow(/CORS/i);
    expect(() => parseConfig({ ...production, ALLOWED_WEB_ORIGINS: 'https://localhost:3000' })).toThrow(/CORS/i);
  });

  it('rejects origins with paths or trailing slashes that would never match a browser Origin header', () => {
    expect(() => parseConfig({ ...production, ALLOWED_WEB_ORIGINS: 'https://www.ma-safaris.test/' })).toThrow(/CORS/i);
    expect(() => parseConfig({ ...production, ALLOWED_WEB_ORIGINS: 'https://www.ma-safaris.test/portal' })).toThrow(/CORS/i);
  });

  it('rejects API and web URLs that are not bare production bases', () => {
    expect(() => parseConfig({ ...production, PUBLIC_API_BASE_URL: 'https://api.ma-safaris.test/v1/' })).toThrow(/API base URL/i);
    expect(() => parseConfig({ ...production, PUBLIC_API_BASE_URL: 'https://api.ma-safaris.test' })).toThrow(/API base URL/i);
    expect(() => parseConfig({ ...production, PUBLIC_WEB_URL: 'https://www.ma-safaris.test/' })).toThrow(/bare public origin/i);
    expect(() => parseConfig({ ...production, PUBLIC_WEB_URL: 'https://www.ma-safaris.test/portal' })).toThrow(/bare public origin/i);
  });

  it('rejects development SMTP defaults in production', () => {
    expect(() => parseConfig({ ...production, SMTP_HOST: '127.0.0.1' })).toThrow(/SMTP_HOST/i);
    expect(() => parseConfig({ ...production, SMTP_HOST: 'localhost' })).toThrow(/SMTP_HOST/i);
    expect(() => parseConfig({ ...production, SMTP_PORT: '1025' })).toThrow(/Mailpit/i);
    expect(() => parseConfig({ ...production, SMTP_PORT: '465', SMTP_SECURE: 'false' })).toThrow(/465/i);
    expect(() => parseConfig({ ...production, SMTP_FROM: 'M&A Safaris <no-reply@ma-safaris.local>' })).toThrow(/sender/i);
  });

  it('rejects non-PostgreSQL/Redis schemes and relative private storage', () => {
    expect(() => parseConfig({ ...production, DATABASE_URL: 'https://db.example.test/ma_safaris' })).toThrow(/DATABASE_URL/i);
    expect(() => parseConfig({ ...production, REDIS_URL: 'https://cache.example.test' })).toThrow(/REDIS_URL/i);
    expect(() => parseConfig({ ...production, LOCAL_PRIVATE_STORAGE_PATH: './var/private-storage' })).toThrow(/absolute path/i);
  });

  it('rejects reserved example domains in production URLs and mail settings', () => {
    expect(() => parseConfig({ ...production, PUBLIC_API_BASE_URL: 'https://api.example.com/v1' })).toThrow(/API base URL/i);
    expect(() => parseConfig({ ...production, PUBLIC_WEB_URL: 'https://app.example.com' })).toThrow(/bare public origin/i);
    expect(() => parseConfig({ ...production, SMTP_HOST: 'smtp.provider.example' })).toThrow(/SMTP_HOST/i);
    expect(() => parseConfig({ ...production, SMTP_FROM: 'M&A Safaris <no-reply@example.com>' })).toThrow(/sender/i);
  });

  it('rejects a wildcard reverse-proxy trust setting', () => {
    expect(() => parseConfig({ ...production, TRUST_PROXY: '*' })).toThrow(/TRUST_PROXY/i);
    expect(() => parseConfig({ ...production, TRUST_PROXY: 'true' })).toThrow(/TRUST_PROXY/i);
  });

  it('rejects out-of-range ports at the schema boundary', () => {
    expect(() => parseConfig({ ...production, API_PORT: '0' })).toThrow();
    expect(() => parseConfig({ ...production, SMTP_PORT: '70000' })).toThrow();
  });

  it('keeps the unimplemented S3 adapter as an explicit blocker', () => {
    expect(() => parseConfig({ ...production, STORAGE_DRIVER: 's3' })).toThrow(/S3 requires/i);
  });
});
