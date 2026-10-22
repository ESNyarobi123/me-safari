import { describe, expect, it } from '@jest/globals';
import { redisConnectionOptions } from '../../packages/backend/src/jobs.js';

describe('worker Redis connection options', () => {
  it('enables TLS and decodes credentials for rediss URLs', () => {
    const options = redisConnectionOptions('rediss://worker:p%40ss%3Aword@cache.internal:6380/2');
    expect(options).toMatchObject({
      host: 'cache.internal',
      port: 6380,
      username: 'worker',
      password: 'p@ss:word',
      db: 2,
      maxRetriesPerRequest: null,
      tls: {},
    });
  });

  it('does not force TLS for plaintext redis URLs', () => {
    const options = redisConnectionOptions('redis://cache.internal:6379');
    expect(options).toMatchObject({ host: 'cache.internal', port: 6379, db: 0 });
    expect(options).not.toHaveProperty('tls');
  });

  it('normalizes IPv6 hosts for ioredis', () => {
    expect(redisConnectionOptions('rediss://[::1]:6380')).toMatchObject({ host: '::1', port: 6380, tls: {} });
  });
});
