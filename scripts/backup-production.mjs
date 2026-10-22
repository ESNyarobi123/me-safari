/**
 * Production database + private-file backup.
 *
 * Usage:
 *   NODE_ENV=production BACKUP_CONFIRM=YES BACKUP_DIR=/var/backups/ma-safaris \
 *     node --env-file=/etc/ma-safaris/api.env scripts/backup-production.mjs
 *
 * The dump uses PostgreSQL 17 tooling and a custom-format archive. Prefer a
 * quiesced window (worker stopped, mutations paused) or a coordinated
 * database/storage snapshot. Encrypt the resulting directory before moving it
 * offsite; this script never prints secrets.
 */
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { chmod, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

if (process.env.BACKUP_CONFIRM !== 'YES') {
  throw new Error('Set BACKUP_CONFIRM=YES to confirm an operator-approved production backup.');
}
if (process.env.NODE_ENV !== 'production') {
  throw new Error('This is the production backup procedure. NODE_ENV must be production.');
}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const root = resolve(import.meta.dirname, '..');
const base = resolve(process.env.BACKUP_DIR ?? join(root, 'var/backups'));
const stamp = new Date().toISOString().replaceAll(':', '-');
const destination = join(base, `ma-safaris-${stamp}`);
await mkdir(destination, { recursive: true, mode: 0o700 });
await chmod(destination, 0o700);

const url = new URL(databaseUrl);
if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
  throw new Error('DATABASE_URL must use the postgres:// or postgresql:// scheme.');
}
const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
if (!database) throw new Error('DATABASE_URL must include a database name.');
const username = decodeURIComponent(url.username);
if (!username) throw new Error('DATABASE_URL must include a database user.');

const pgDump = process.env.PG_DUMP_BIN ?? 'pg_dump';
const version = spawnSync(pgDump, ['--version'], { encoding: 'utf8' });
if (version.error || version.status !== 0) {
  throw new Error(`Could not run ${pgDump}; install PostgreSQL 17 client tools or set PG_DUMP_BIN.`);
}
const pgDumpVersion = version.stdout.trim();
const pgDumpMajor = Number(/pg_dump \(PostgreSQL\) (\d+)/.exec(pgDumpVersion)?.[1]);
if (!pgDumpMajor || pgDumpMajor < 17) {
  throw new Error(`pg_dump 17 or newer is required; found "${pgDumpVersion}". Set PG_DUMP_BIN to the PostgreSQL 17 client.`);
}

const pgArgs = [
  '--host', url.hostname.replace(/^\[|\]$/g, ''),
  '--port', url.port || '5432',
  '--username', username,
  '--dbname', database,
  '--format=custom',
  '--no-owner',
  '--no-acl',
];
const childEnv = { ...process.env, PGPASSWORD: decodeURIComponent(url.password) };
const sslmode = url.searchParams.get('sslmode');
if (sslmode) childEnv.PGSSLMODE = sslmode;

const dump = join(destination, 'database.dump');
try {
  await new Promise((ok, bad) => {
    const child = spawn(pgDump, pgArgs, {
      stdio: ['ignore', 'pipe', 'inherit'],
      env: childEnv,
    });
    child.on('error', bad);
    const completed = new Promise((done, fail) => {
      child.on('close', (code) => (code === 0 ? done() : fail(new Error(`pg_dump exited ${code}`))));
    });
    Promise.all([
      pipeline(child.stdout, createWriteStream(dump, { mode: 0o600 })),
      completed,
    ]).then(() => ok(), bad);
  });
} catch (error) {
  await rm(dump, { force: true });
  throw error;
}
await chmod(dump, 0o600);

const storage = resolve(
  process.env.PRIVATE_STORAGE_PATH ??
  process.env.LOCAL_PRIVATE_STORAGE_PATH ??
  join(root, 'var/private-storage'),
);
const files = join(destination, 'private-files.tar.gz');
let storageIncluded = false;
try {
  const storageInfo = await stat(storage);
  if (!storageInfo.isDirectory()) throw new Error(`Private storage path is not a directory: ${storage}`);
  await new Promise((ok, bad) => {
    const child = spawn('tar', ['-czf', files, '-C', storage, '.'], { stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('error', bad);
    child.on('close', (code) => (code === 0 ? ok() : bad(new Error(`tar exited ${code}`))));
  });
  await chmod(files, 0o600);
  storageIncluded = true;
} catch (error) {
  if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
    storageIncluded = false;
  } else {
    throw error;
  }
}

const checksum = async (path) => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
};
const manifest = {
  createdAt: new Date().toISOString(),
  database,
  pgDumpVersion,
  pgDumpMajor,
  storageIncluded,
  files: {
    'database.dump': { sha256: await checksum(dump), bytes: (await stat(dump)).size },
    ...(storageIncluded
      ? { 'private-files.tar.gz': { sha256: await checksum(files), bytes: (await stat(files)).size } }
      : {}),
  },
};
await writeFile(join(destination, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });

console.log(`Production backup written to ${destination}`);
console.log('Encrypt this directory before moving it offsite, then verify the manifest after upload.');
