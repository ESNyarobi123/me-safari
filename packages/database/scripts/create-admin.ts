/**
 * Create or repair a staff account in a live environment.
 *
 * Never hard-codes a password: operators pass one through the environment, and
 * only the argon2id hash is written to the database. Safe to re-run — the user,
 * role grant and staff profile are all upserted.
 *
 *   NODE_ENV=production node --env-file=/etc/ma-safaris/api.env \
 *     --import tsx packages/database/scripts/create-admin.ts
 *
 * Required: ADMIN_EMAIL, ADMIN_PASSWORD
 * Optional: ADMIN_NAME, ADMIN_ROLE (default ADMIN), ADMIN_PHONE
 */
import { config } from 'dotenv';
import argon2 from 'argon2';
import { createDatabase } from '../src/index.js';

config({ path: '../../.env', quiet: true });

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || 'M&A Safaris Admin';
const role = process.env.ADMIN_ROLE?.trim() || 'ADMIN';

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  throw new Error('ADMIN_EMAIL must be a valid email address');
}
if (!password || password.length < 12) {
  throw new Error('ADMIN_PASSWORD must be at least 12 characters');
}

const db = createDatabase();
try {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date() },
    create: { email, passwordHash, emailVerifiedAt: new Date() },
  });

  const grant = await db.userRoleGrant.findFirst({ where: { userId: user.id, role, revokedAt: null } });
  if (!grant) await db.userRoleGrant.create({ data: { userId: user.id, role } });

  await db.staffProfile.upsert({
    where: { userId: user.id },
    update: { displayName: name, active: true },
    create: {
      userId: user.id,
      displayName: name,
      phone: process.env.ADMIN_PHONE?.trim() || null,
      languages: ['en', 'sw'],
      capabilities: role === 'DRIVER_GUIDE' ? ['wildlife', 'cultural', 'transfer', 'mountain'] : ['operations'],
    },
  });

  console.log(JSON.stringify({ level: 'info', event: 'staff_account_ready', userId: user.id, email, role }));
} finally {
  await db.$disconnect();
}
