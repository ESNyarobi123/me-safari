import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

export { PrismaClient, Prisma } from './generated/prisma/client.js';
export * from './generated/prisma/enums.js';

export function createDatabase(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 10_000,
    query_timeout: 15_000,
  });
  return new PrismaClient({ adapter, transactionOptions: { maxWait: 5_000, timeout: 15_000 } });
}
