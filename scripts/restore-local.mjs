import 'dotenv/config';
import { readFile, mkdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

if(process.env.NODE_ENV==='production')throw new Error('Development restore helper is disabled in production');
const source=process.argv[2];
if(!source)throw new Error('Usage: node scripts/restore-local.mjs BACKUP_DIRECTORY [NEW_DATABASE_NAME]');
const root=resolve(import.meta.dirname,'..'),backup=resolve(root,source);
const target=process.argv[3]??`ma_safaris_restore_${Date.now()}`;
if(!/^ma_safaris_restore_[a-z0-9_]+$/.test(target))throw new Error('Restore target must be a NEW ma_safaris_restore_* database; active databases cannot be overwritten');
const manifest=JSON.parse(await readFile(join(backup,'manifest.json'),'utf8'));
for(const filename of ['database.dump','private-files.tar.gz']){const h=createHash('sha256');for await(const chunk of createReadStream(join(backup,filename)))h.update(chunk);if(h.digest('hex')!==manifest.files[filename].sha256)throw new Error(`Checksum mismatch: ${filename}`);}
const run=async(command,args,input)=>{
  const child=spawn(command,args,{cwd:root,stdio:[input?'pipe':'ignore','inherit','inherit']});
  const complete=new Promise((ok,bad)=>{child.on('error',bad);child.on('close',code=>code===0?ok():bad(new Error(`${command} exited ${code}`)));});
  if(input)await Promise.all([pipeline(createReadStream(input),child.stdin),complete]);else await complete;
};
await run('docker',['compose','exec','-T','postgres','psql','-U','ma_dev','-d','postgres','-v','ON_ERROR_STOP=1','-c',`CREATE DATABASE "${target}" OWNER ma_dev`]);
await run('docker',['compose','exec','-T','postgres','pg_restore','-U','ma_dev','-d',target,'--exit-on-error','--no-owner','--no-acl'],join(backup,'database.dump'));
const storage=join(root,'var','restored-private-files',target);
await mkdir(storage,{recursive:true,mode:0o700});
await run('tar',['-xzf',join(backup,'private-files.tar.gz'),'-C',storage]);
await run('docker',['compose','exec','-T','postgres','psql','-U','ma_dev','-d',target,'-v','ON_ERROR_STOP=1','-c','SELECT (SELECT count(*) FROM "Booking") AS bookings, (SELECT count(*) FROM "PaymentPosting") AS captures, (SELECT count(*) FROM "AuditEvent") AS audits;']);
console.log(`Restore verified in new database ${target}. Private files: ${storage}`);
console.log('The active database and storage were preserved. Stop API/worker and set DATABASE_URL plus LOCAL_PRIVATE_STORAGE_PATH to the restored targets when intentionally switching.');
