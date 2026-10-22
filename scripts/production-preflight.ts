/**
 * Production release preflight.
 *
 * Usage:
 *   NODE_ENV=production node --env-file=/etc/ma-safaris/api.env scripts/production-preflight.ts
 *   pnpm preflight:production --skip-connect
 *   pnpm preflight:production --json
 *
 * This command never prints secret values. It exits non-zero when the release
 * is misconfigured or when a known launch blocker is still present.
 */
import { access, constants, readFile, readdir, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { connect as netConnect } from 'node:net';
import { connect as tlsConnect } from 'node:tls';
import { promisify } from 'node:util';
import { isAbsolute, relative, resolve } from 'node:path';
import { createDatabase } from '../packages/database/src/index.js';
import {
  evaluateProductionEnv,
  exitCode,
  summarize,
  type CheckResult,
} from './production-preflight-lib.js';

async function exists(path: string) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

const BUNDLE_TEXT_FILE = /\.(?:html|js|mjs|css|json|txt|xml|webmanifest)$/i;
const BUNDLE_LOOPBACK = /https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?/i;

/** Fail when the static export was built with a development API origin baked in. */
async function findBundleLoopbacks(root: string): Promise<string[]> {
  const out = resolve(root, 'apps/web/out');
  const candidates: string[] = [];
  const walk = async (directory: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (BUNDLE_TEXT_FILE.test(entry.name)) candidates.push(path);
    }
  };
  await walk(out);

  const offenders: string[] = [];
  for (const file of candidates) {
    const info = await stat(file).catch(() => undefined);
    if (!info || info.size > 4_000_000) continue;
    const content = await readFile(file, 'utf8').catch(() => '');
    if (BUNDLE_LOOPBACK.test(content)) offenders.push(relative(root, file));
  }
  return offenders;
}

const execFileAsync = promisify(execFile);

/** Minimal RESP PING so the preflight does not depend on a client package. */
function redisPing(connection: string, timeoutMs = 4000): Promise<void> {
  return new Promise((done, fail) => {
    const url = new URL(connection);
    if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
      fail(new Error('Unsupported Redis scheme.'));
      return;
    }
    const host = url.hostname;
    const port = Number(url.port || 6379);
    const socket = url.protocol === 'rediss:'
      ? tlsConnect({ host, port, servername: host })
      : netConnect({ host, port });
    socket.setTimeout(timeoutMs);

    const encode = (args: string[]) =>
      `*${args.length}\r\n${args.map((arg) => `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`).join('')}`;
    const commands: string[] = [];
    const password = decodeURIComponent(url.password);
    const username = decodeURIComponent(url.username);
    if (password) commands.push(encode(username ? ['AUTH', username, password] : ['AUTH', password]));
    const database = url.pathname.replace(/^\//, '');
    if (database) commands.push(encode(['SELECT', database]));
    commands.push(encode(['PING']));

    let buffer = '';
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) fail(error);
      else done();
    };
    socket.on('connect', () => socket.write(commands.join('')));
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const errorLine = buffer.split('\r\n').find((line) => line.startsWith('-'));
      if (errorLine) return finish(new Error(errorLine.slice(1)));
      if (buffer.includes('+PONG')) return finish();
    });
    socket.on('timeout', () => finish(new Error('Redis PING timed out.')));
    socket.on('error', (error) => finish(error));
    socket.on('close', () => finish(new Error('Redis closed the connection before PONG.')));
  });
}

async function main() {
  const root = process.cwd();
  const args = new Set(process.argv.slice(2));
  const json = args.has('--json');
  const skipConnect = args.has('--skip-connect');

  if (process.env.NODE_ENV !== 'production') {
    const { config: loadEnv } = await import('dotenv');
    loadEnv({ path: resolve(root, '.env'), quiet: true });
  }

  const results: CheckResult[] = evaluateProductionEnv(process.env);

  for (const artifact of [
    'apps/api/dist/main.js',
    'apps/worker/dist/main.js',
    'packages/backend/dist/index.js',
    'packages/database/dist/src/index.js',
    'apps/web/out/index.html',
    'apps/web/out/portal/index.html',
  ]) {
    const present = await exists(resolve(root, artifact));
    results.push({
      id: `artifact:${artifact}`,
      level: present ? 'pass' : 'fail',
      detail: present ? 'is built.' : 'is missing or empty; run the production build first.',
    });
  }

  const loopbacks = await findBundleLoopbacks(root);
  results.push({
    id: 'web-bundle:loopback-api',
    level: loopbacks.length ? 'fail' : 'pass',
    detail: loopbacks.length
      ? `contains a development API origin in ${loopbacks.slice(0, 3).join(', ')}; rebuild with the production NEXT_PUBLIC_API_BASE_URL.`
      : 'contains no loopback API origins.',
  });

  try {
    await execFileAsync(
      process.execPath,
      ['--conditions=production', '--input-type=module', '-e', "await import('@ma/backend')"],
      { cwd: resolve(root, 'apps/api'), env: process.env, timeout: 20_000 },
    );
    results.push({
      id: 'production-module-resolution',
      level: 'pass',
      detail: 'compiled API graph resolves @ma/backend and @ma/database through production exports.',
    });
  } catch {
    results.push({
      id: 'production-module-resolution',
      level: 'fail',
      detail: 'compiled API graph failed to load with --conditions=production.',
    });
  }

  try {
    await execFileAsync(
      process.execPath,
      ['--conditions=production', '--input-type=module', '-e', "await import('@ma/backend/jobs')"],
      { cwd: resolve(root, 'apps/worker'), env: process.env, timeout: 20_000 },
    );
    results.push({
      id: 'production-worker-module-resolution',
      level: 'pass',
      detail: 'compiled worker graph resolves @ma/backend/jobs through production exports.',
    });
  } catch {
    results.push({
      id: 'production-worker-module-resolution',
      level: 'fail',
      detail: 'compiled worker graph failed to load with --conditions=production.',
    });
  }

  const storage = process.env.LOCAL_PRIVATE_STORAGE_PATH?.trim() || './var/private-storage';
  const storageDriver = process.env.STORAGE_DRIVER?.trim() || 'local';
  if (storageDriver === 'local' && !isAbsolute(storage)) {
    results.push({
      id: 'LOCAL_PRIVATE_STORAGE_PATH',
      level: 'fail',
      detail: 'must be an absolute path writable by the API/worker account in production.',
    });
  }
  const storagePath = isAbsolute(storage) ? storage : resolve(root, storage);
  try {
    const storageInfo = await stat(storagePath);
    if (!storageInfo.isDirectory()) throw new Error('Private storage path is not a directory.');
    await access(storagePath, constants.W_OK);
    results.push({ id: 'private-storage', level: 'pass', detail: 'is a writable directory.' });
  } catch {
    results.push({ id: 'private-storage', level: 'fail', detail: 'must exist as a directory and be writable by the API/worker account.' });
  }

  if (process.env.NODE_ENV !== 'production') {
    results.push({
      id: 'connectivity',
      level: 'warn',
      detail: 'skipped because NODE_ENV is not production.',
    });
  } else if (skipConnect) {
    results.push({ id: 'connectivity', level: 'warn', detail: 'skipped by --skip-connect.' });
  } else {
    if (process.env.DATABASE_URL) {
      const db = createDatabase(process.env.DATABASE_URL);
      try {
        await db.$queryRaw`SELECT 1`;
        results.push({ id: 'connectivity:database', level: 'pass', detail: 'accepted a query.' });
        try {
          const unfinished = await db.$queryRaw<Array<{ migration_name: string }>>`
            SELECT migration_name FROM "_prisma_migrations"
            WHERE finished_at IS NULL AND rolled_back_at IS NULL
            ORDER BY started_at ASC LIMIT 5
          `;
          results.push({
            id: 'connectivity:migrations',
            level: unfinished.length ? 'fail' : 'pass',
            detail: unfinished.length
              ? `unfinished migration(s): ${unfinished.slice(0, 3).map((row) => row.migration_name).join(', ')}.`
              : 'no unfinished migrations.',
          });
        } catch {
          results.push({
            id: 'connectivity:migrations',
            level: 'fail',
            detail: 'could not inspect _prisma_migrations; apply migrations before the release preflight.',
          });
        }
      } catch {
        results.push({ id: 'connectivity:database', level: 'fail', detail: 'could not query PostgreSQL with DATABASE_URL.' });
      } finally {
        await db.$disconnect().catch(() => undefined);
      }
    }
    if (process.env.REDIS_URL) {
      try {
        await redisPing(process.env.REDIS_URL);
        results.push({ id: 'connectivity:redis', level: 'pass', detail: 'answered PING.' });
      } catch {
        results.push({ id: 'connectivity:redis', level: 'fail', detail: 'could not reach Redis with REDIS_URL.' });
      }
    }
  }

  if (json) {
    console.log(JSON.stringify({ results, summary: summarize(results) }, null, 2));
  } else {
    const labels: Record<CheckResult['level'], string> = {
      pass: 'PASS',
      warn: 'WARN',
      fail: 'FAIL',
      blocked: 'BLOCKED',
    };
    for (const result of results) {
      console.log(`[${labels[result.level]}] ${result.id}: ${result.detail}`);
    }
    const counts = summarize(results);
    console.log(
      `\n${counts.pass} passed, ${counts.warn} warnings, ${counts.fail} failures, ${counts.blocked} launch blockers.`,
    );
    if (counts.fail || counts.blocked) {
      console.log('Release is not ready. Resolve FAIL and BLOCKED items before exposing the service.');
    }
  }

  process.exitCode = exitCode(results);
}

void main();
