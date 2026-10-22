import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const exists = async p => { try {await access(p);return true;} catch {return false;} };
await mkdir(resolve(root,'var/private-storage'),{recursive:true});
if (!await exists(resolve(root,'.env'))) {
  const password=randomBytes(18).toString('hex');
  const demoPassword=randomBytes(18).toString('base64url');
  let contents=await readFile(resolve(root,'.env.example'),'utf8');
  contents=contents.replaceAll('CHANGE_LOCAL_PASSWORD',password).replace('GENERATE_RANDOM_LOCAL_SECRET',randomBytes(48).toString('hex')).replace('GENERATE_DIFFERENT_RANDOM_LOCAL_SECRET',randomBytes(48).toString('hex')).replace('SET_A_LOCAL_DEVELOPMENT_PASSWORD',demoPassword);
  contents=contents.replaceAll('127.0.0.1:5432','127.0.0.1:5433').replace('127.0.0.1:6379','127.0.0.1:6380');
  contents+=`\nPOSTGRES_PASSWORD=${password}\n`;
  await writeFile(resolve(root,'.env'),contents,{mode:0o600});
  await writeFile(resolve(root,'var/demo-accounts.txt'),`Development only. Password: ${demoPassword}\ncustomer.demo@ma-safaris.local\noperations.demo@ma-safaris.local\nguide.demo@ma-safaris.local\nadmin.demo@ma-safaris.local\n`,{mode:0o600});
}
for (const [file,contents] of [
  ['apps/mobile/.env','EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:4000/v1\nEXPO_PUBLIC_APP_ENV=development\n'],
  ['apps/web/.env.local','NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000/v1\n']
]) {await mkdir(resolve(root,file,'..'),{recursive:true}); if (!await exists(resolve(root,file))) await writeFile(resolve(root,file),contents,{mode:0o600});}
console.log('Local environment preserved/created. Accounts: var/demo-accounts.txt. Run pnpm infra:up, db:generate, db:migrate, db:seed.');
