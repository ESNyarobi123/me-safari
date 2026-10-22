/**
 * Offline verifier for a production backup directory.
 *
 * Usage:
 *   node scripts/verify-backup.mjs /var/backups/ma-safaris/ma-safaris-<timestamp>
 *   PG_RESTORE_BIN=/usr/lib/postgresql/17/bin/pg_restore node scripts/verify-backup.mjs <dir>
 *
 * This command does not connect to the database or print secrets. It verifies
 * the manifest checksums, file permissions and archive readability. A backup is
 * still not "restore-tested" until it has been restored into an isolated
 * environment and the application has passed its smoke checks.
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/verify-backup.mjs <backup-directory>');
  process.exit(2);
}

const directory = resolve(target);
const errors = [];

const fail = (message) => errors.push(message);

const hashFile = async (path) => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
};

const requirePrivateFile = async (name, expectedBytes) => {
  const path = join(directory, name);
  let info;
  try {
    info = await lstat(path);
  } catch {
    fail(`${name} is missing.`);
    return;
  }
  if (!info.isFile()) {
    fail(`${name} is not a regular file.`);
    return;
  }
  if ((info.mode & 0o077) !== 0) fail(`${name} is readable by group/other (mode ${(info.mode & 0o777).toString(8)}).`);
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 0) fail(`${name} has an invalid byte count in the manifest.`);
  else if (info.size !== expectedBytes) fail(`${name} size ${info.size} does not match manifest ${expectedBytes}.`);
};

let manifest;
try {
  manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    backup: directory,
    errors: [`manifest.json is missing or invalid: ${error instanceof Error ? error.message : 'unknown error'}`],
  }, null, 2));
  process.exit(1);
}

if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
  console.error(JSON.stringify({ ok: false, backup: directory, errors: ['manifest must be a JSON object.'] }, null, 2));
  process.exit(1);
}
{
  if (typeof manifest.database !== 'string' || !manifest.database) fail('manifest.database is required.');
  if (typeof manifest.createdAt !== 'string' || Number.isNaN(Date.parse(manifest.createdAt))) fail('manifest.createdAt is not a valid timestamp.');
  if (typeof manifest.storageIncluded !== 'boolean') fail('manifest.storageIncluded must be a boolean.');
  if (!Number.isInteger(manifest.pgDumpMajor) || manifest.pgDumpMajor < 17) fail('manifest.pgDumpMajor must be 17 or newer.');
  if (typeof manifest.pgDumpVersion !== 'string' || !manifest.pgDumpVersion.startsWith('pg_dump')) fail('manifest.pgDumpVersion is missing.');
  if (!manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) {
    fail('manifest.files must be an object.');
  } else {
    const allowed = new Set(['database.dump', 'private-files.tar.gz']);
    for (const [name, entry] of Object.entries(manifest.files)) {
      if (!allowed.has(name)) fail(`manifest references an unexpected file: ${name}.`);
      if (!entry || typeof entry !== 'object') {
        fail(`${name} has an invalid manifest entry.`);
        continue;
      }
      if (typeof entry.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(entry.sha256)) fail(`${name} has an invalid sha256.`);
      if (!Number.isInteger(entry.bytes) || entry.bytes < 1) fail(`${name} has an invalid byte count.`);
    }
    if (!manifest.files['database.dump']) fail('manifest.files must include database.dump.');
    if (manifest.storageIncluded === true && !manifest.files['private-files.tar.gz']) fail('storageIncluded is true but private-files.tar.gz is not in the manifest.');
    if (manifest.storageIncluded === false && manifest.files['private-files.tar.gz']) fail('storageIncluded is false but private-files.tar.gz is in the manifest.');

    for (const [name, entry] of Object.entries(manifest.files)) {
      if (!entry || typeof entry !== 'object') continue;
      await requirePrivateFile(name, entry.bytes);
      try {
        const actual = await hashFile(join(directory, name));
        if (typeof entry.sha256 === 'string' && actual !== entry.sha256) fail(`${name} checksum does not match the manifest.`);
      } catch {
        fail(`${name} could not be hashed.`);
      }
    }
  }
}

try {
  const manifestInfo = await lstat(join(directory, 'manifest.json'));
  if (!manifestInfo.isFile()) fail('manifest.json is not a regular file.');
  else if ((manifestInfo.mode & 0o077) !== 0) fail(`manifest.json is readable by group/other (mode ${(manifestInfo.mode & 0o777).toString(8)}).`);
} catch {
  fail('manifest.json could not be inspected.');
}

try {
  const directoryInfo = await lstat(directory);
  if (!directoryInfo.isDirectory()) fail('backup path is not a directory.');
  else if ((directoryInfo.mode & 0o077) !== 0) fail(`backup directory is accessible by group/other (mode ${(directoryInfo.mode & 0o777).toString(8)}).`);
} catch {
  fail('backup directory could not be inspected.');
}

const expectedFiles = new Set(['manifest.json', ...Object.keys(manifest.files ?? {})]);
try {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!expectedFiles.has(entry.name)) fail(`unexpected file in backup directory: ${entry.name}.`);
  }
} catch {
  fail('backup directory could not be listed.');
}

if (manifest.files?.['database.dump']) {
  const pgRestore = process.env.PG_RESTORE_BIN ?? 'pg_restore';
  const version = spawnSync(pgRestore, ['--version'], { encoding: 'utf8', timeout: 15_000 });
  const versionText = version.stdout?.trim() ?? '';
  const major = Number(/pg_restore \(PostgreSQL\) (\d+)/.exec(versionText)?.[1]);
  if (version.error || version.status !== 0 || !major || major < 17) {
    fail(`pg_restore 17 or newer is required; found "${versionText || 'unavailable'}". Set PG_RESTORE_BIN to the PostgreSQL 17 client.`);
  } else {
    const check = spawnSync(pgRestore, ['--list', join(directory, 'database.dump')], {
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 16 * 1024 * 1024,
    });
    if (check.error || check.status !== 0) {
      fail(`pg_restore --list failed. ${(check.stderr ?? '').trim()}`.trim());
    } else if (!check.stdout.trim()) {
      fail('pg_restore --list returned an empty archive listing.');
    }
  }
}

if (manifest.files?.['private-files.tar.gz']) {
  const check = spawnSync('tar', ['-tzf', join(directory, 'private-files.tar.gz')], {
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (check.error || check.status !== 0) {
    fail(`tar -tzf failed: ${(check.stderr ?? '').trim()}`.trim());
  }
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, backup: directory, errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  backup: directory,
  database: manifest.database,
  createdAt: manifest.createdAt,
  pgDumpVersion: manifest.pgDumpVersion,
  storageIncluded: manifest.storageIncluded,
  files: Object.keys(manifest.files),
  note: 'Checksums and archive listings passed. A restore drill is still required before relying on this backup.',
}, null, 2));
