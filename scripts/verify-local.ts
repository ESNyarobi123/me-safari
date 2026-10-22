import { createDatabase } from '../packages/database/src/index.js';
import { createBackend } from '../packages/backend/src/index.js';
import { createApp } from '../apps/api/src/app.js';
import { createConnection } from 'node:net';
import Redis from 'ioredis';
import { config as loadEnv } from 'dotenv';

loadEnv({ quiet: true });

async function checkPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port, timeout: 2000 });
    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function verify() {
  console.log('====================================================');
  console.log('       M&A SAFARIS — LOCAL SYSTEM VERIFICATION      ');
  console.log('====================================================\n');

  let allPassed = true;

  // 1. Database Check
  try {
    const dbUrl = process.env.DATABASE_URL || 'postgresql://ma_dev:dev_secret_change_me@127.0.0.1:5433/ma_safaris';
    const db = createDatabase(dbUrl);
    const userCount = await db.user.count();
    const pkgCount = await db.package.count();
    const destCount = await db.destination.count();
    const vehicleCount = await db.vehicle.count();
    const staffCount = await db.staffProfile.count();
    await db.$disconnect();

    console.log(`[PASS] PostgreSQL Database (Port 5433)`);
    console.log(`       - Users: ${userCount}, Packages: ${pkgCount}, Destinations: ${destCount}, Vehicles: ${vehicleCount}, Staff: ${staffCount}`);
  } catch (err: any) {
    allPassed = false;
    console.error(`[FAIL] PostgreSQL Database: ${err.message}`);
  }

  // 2. Redis Check
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6380';
    const redis = new (Redis as any)(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 3000 });
    const pong = await redis.ping();
    await redis.quit();
    if (pong === 'PONG') {
      console.log(`[PASS] Redis Cache & BullMQ Store (Port 6380): PONG received`);
    } else {
      throw new Error(`Unexpected Redis response: ${pong}`);
    }
  } catch (err: any) {
    allPassed = false;
    console.error(`[FAIL] Redis Service: ${err.message}`);
  }

  // 3. Mailpit SMTP Check
  const smtpPort = Number(process.env.SMTP_PORT) || 1025;
  const smtpHost = process.env.SMTP_HOST || '127.0.0.1';
  const mailpitOk = await checkPort(smtpHost, smtpPort);
  if (mailpitOk) {
    console.log(`[PASS] Mailpit SMTP Delivery Sink (${smtpHost}:${smtpPort}): Accessible`);
  } else {
    allPassed = false;
    console.error(`[FAIL] Mailpit SMTP Sink (${smtpHost}:${smtpPort}): Connection refused`);
  }

  // 4. API & OpenAPI Routes Health
  try {
    const db = createDatabase();
    const backend = createBackend(db);
    const { app, operations } = await createApp(backend, false);
    const fastify = app.getHttpAdapter().getInstance();

    const healthRes = await fastify.inject({ method: 'GET', url: '/v1/health/ready' });
    const companyRes = await fastify.inject({ method: 'GET', url: '/v1/public/company' });
    await app.close();
    await db.$disconnect();

    if (healthRes.statusCode === 200 && companyRes.statusCode === 200) {
      console.log(`[PASS] Fastify / NestJS API Runtime & Contracts`);
      console.log(`       - Total Registered Operations: ${operations.length}`);
      console.log(`       - Readiness Probe /v1/health/ready: 200 OK`);
      console.log(`       - Public Company Projection /v1/public/company: 200 OK`);
    } else {
      throw new Error(`Health checks failed: health=${healthRes.statusCode}, company=${companyRes.statusCode}`);
    }
  } catch (err: any) {
    allPassed = false;
    console.error(`[FAIL] API Engine & Route Execution: ${err.message}`);
  }

  console.log('\n----------------------------------------------------');
  if (allPassed) {
    console.log('>> RESULT: ALL LOCAL SERVICES AND CONTRACTS ARE HEALTHY <<');
    console.log('----------------------------------------------------\n');
    process.exit(0);
  } else {
    console.log('>> RESULT: SOME CHECKS FAILED. REVIEW LOGS ABOVE. <<');
    console.log('----------------------------------------------------\n');
    process.exit(1);
  }
}

verify().catch((e) => {
  console.error('Unexpected error during verification:', e);
  process.exit(1);
});
