import { config as loadEnv } from 'dotenv';
import { isAbsolute,resolve } from 'node:path';
import { z } from 'zod';
if(process.env.NODE_ENV!=='production') loadEnv({path:resolve(import.meta.dirname,'../../../.env'),quiet:true});
const LOOPBACK_ORIGIN=/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(?::\d+)?$/;
const PLACEHOLDER_SECRET=/GENERATE|CHANGE_|SET_A_|CHANGEME|REPLACE_|example\.com/i;
const PLACEHOLDER_HOST=/(^|\.)example(?:\.(?:com|net|org))?$/i;
function isPlaceholderHost(host:string):boolean {
  return PLACEHOLDER_HOST.test(host.toLowerCase().replace(/^\[|\]$/g,''));
}
function isLoopbackHost(host:string):boolean {
  const normalized=host.toLowerCase().replace(/^\[|\]$/g,'');
  return normalized==='localhost'||normalized==='::1'||normalized==='0.0.0.0'||/^127(?:\.\d{1,3}){3}$/.test(normalized);
}
function isExplicitHttpsOrigin(origin:string):boolean {
  try {
    const url=new URL(origin);
    return url.protocol==='https:'&&url.origin===origin&&!url.username&&!url.password&&!isLoopbackHost(url.hostname)&&!isPlaceholderHost(url.hostname);
  } catch {
    return false;
  }
}
const schema=z.object({
  NODE_ENV:z.enum(['development','test','production']).default('development'),
  DATABASE_URL:z.string().url(),REDIS_URL:z.string().url(),JWT_ACCESS_SECRET:z.string().min(32),
  JWT_ACCESS_TTL_SECONDS:z.coerce.number().int().min(60).max(3600).default(900),REFRESH_TTL_DAYS:z.coerce.number().int().min(1).max(90).default(30),
  API_HOST:z.string().default('0.0.0.0'),API_PORT:z.coerce.number().int().min(1).max(65535).default(4000),
  TRUST_PROXY:z.string().default('127.0.0.1,::1').transform(v=>v.split(',').map(part=>part.trim()).filter(Boolean).join(',')||'127.0.0.1,::1'),
  PUBLIC_API_BASE_URL:z.string().url().default('http://127.0.0.1:4000/v1'),
  PUBLIC_WEB_URL:z.string().url().default('http://localhost:3000'),
  APP_DEEP_LINK_SCHEME:z.string().default('masafaris'),ALLOWED_WEB_ORIGINS:z.string().default('http://localhost:3000,http://127.0.0.1:3000'),
  COMPANY_TIMEZONE:z.string().default('Africa/Dar_es_Salaam'),
  PAYMENT_PROVIDER:z.enum(['mock','snippe','disabled']).default('mock'),ENABLE_DEV_PAYMENT_SIMULATION:z.enum(['true','false']).default('false'),MOCK_WEBHOOK_SECRET:z.string().default(''),
  SNIPPE_API_KEY:z.string().default(''),SNIPPE_WEBHOOK_SECRET:z.string().default(''),SNIPPE_BASE_URL:z.string().url().default('https://api.snippe.sh'),SNIPPE_HTTP_TIMEOUT_MS:z.coerce.number().int().min(1000).max(30000).default(10000),
  SNIPPE_TZS_PER_USD:z.coerce.number().min(0).max(100000).default(0),
  STORAGE_DRIVER:z.enum(['local','s3']).default('local'),LOCAL_PRIVATE_STORAGE_PATH:z.string().default('./var/private-storage'),
  SMTP_HOST:z.string().default('127.0.0.1'),SMTP_PORT:z.coerce.number().int().min(1).max(65535).default(1025),SMTP_SECURE:z.enum(['true','false']).default('false'),SMTP_FROM:z.string().default('M&A Safaris Development <noreply@ma-safaris.local>'),
  PUSH_PROVIDER:z.enum(['disabled','expo']).default('disabled')
});
export type Config=z.infer<typeof schema>;
export function parseConfig(env:NodeJS.ProcessEnv):Config {
  const parsed=schema.parse(env);
  if(parsed.PAYMENT_PROVIDER==='mock'&&parsed.MOCK_WEBHOOK_SECRET.length<32) throw new Error('MOCK_WEBHOOK_SECRET must be at least 32 characters when the development payment adapter is selected.');
  if(parsed.PAYMENT_PROVIDER==='snippe') {
    if(!/^snp_[A-Za-z0-9_]{16,}$/.test(parsed.SNIPPE_API_KEY)||PLACEHOLDER_SECRET.test(parsed.SNIPPE_API_KEY)) throw new Error('SNIPPE_API_KEY must be a real Snippe API key with the collection:create and collection:read scopes.');
    if(parsed.SNIPPE_WEBHOOK_SECRET.trim().length<32||PLACEHOLDER_SECRET.test(parsed.SNIPPE_WEBHOOK_SECRET)) throw new Error('SNIPPE_WEBHOOK_SECRET must be the webhook signing key from the Snippe dashboard.');
    const snippe=new URL(parsed.SNIPPE_BASE_URL);
    if(!['https:','http:'].includes(snippe.protocol)||snippe.username||snippe.password||snippe.search||snippe.hash) throw new Error('SNIPPE_BASE_URL must be the Snippe API origin.');
    if(parsed.NODE_ENV==='production'&&(snippe.protocol!=='https:'||isLoopbackHost(snippe.hostname)||isPlaceholderHost(snippe.hostname))) throw new Error('SNIPPE_BASE_URL must be the HTTPS Snippe API origin.');
    if(parsed.SNIPPE_TZS_PER_USD>0&&!/^\d{1,6}(?:\.\d{1,4})?$/.test(String(parsed.SNIPPE_TZS_PER_USD))) throw new Error('SNIPPE_TZS_PER_USD must be a positive rate with at most four decimal places.');
    if(parsed.NODE_ENV==='production'&&parsed.SNIPPE_TZS_PER_USD<=0) throw new Error('Production USD bookings need an approved SNIPPE_TZS_PER_USD rate before launch.');
  }
  if(parsed.NODE_ENV==='production') {
    if(parsed.ENABLE_DEV_PAYMENT_SIMULATION==='true'||parsed.PAYMENT_PROVIDER==='mock') throw new Error('Production cannot enable the development payment adapter or simulation. Select a verified live adapter before release.');
    if(!/^postgres(ql)?:\/\//.test(parsed.DATABASE_URL)) throw new Error('Production DATABASE_URL must use the postgres:// or postgresql:// scheme.');
    if(!/^rediss?:\/\//.test(parsed.REDIS_URL)) throw new Error('Production REDIS_URL must use the redis:// or rediss:// scheme.');
    if(parsed.TRUST_PROXY.split(',').some(part=>['*','true','0.0.0.0/0','::/0'].includes(part))) throw new Error('Production TRUST_PROXY must name the reverse proxy address, not trust every peer.');
    if(parsed.JWT_ACCESS_SECRET.trim().length<32||PLACEHOLDER_SECRET.test(parsed.JWT_ACCESS_SECRET)) throw new Error('Placeholder production secrets are forbidden.');
    if(!parsed.PUBLIC_API_BASE_URL.startsWith('https://')||parsed.ALLOWED_WEB_ORIGINS.includes('*')) throw new Error('Production requires HTTPS API and explicit CORS origins.');
    const apiUrl=new URL(parsed.PUBLIC_API_BASE_URL);
    if(apiUrl.username||apiUrl.password||apiUrl.search||apiUrl.hash||!apiUrl.pathname.endsWith('/v1')||isLoopbackHost(apiUrl.hostname)||isPlaceholderHost(apiUrl.hostname)) throw new Error('Production requires an HTTPS API base URL ending in /v1 on a public host.');
    if(!parsed.PUBLIC_WEB_URL.startsWith('https://')) throw new Error('Production requires an HTTPS customer web URL.');
    const webUrl=new URL(parsed.PUBLIC_WEB_URL);
    if(webUrl.username||webUrl.password||webUrl.search||webUrl.hash||webUrl.pathname!=='/'||webUrl.origin!==parsed.PUBLIC_WEB_URL||isLoopbackHost(webUrl.hostname)||isPlaceholderHost(webUrl.hostname)) throw new Error('Production requires an HTTPS customer web URL that is a bare public origin.');
    const origins=parsed.ALLOWED_WEB_ORIGINS.split(',').map(v=>v.trim()).filter(Boolean);
    if(!origins.length||origins.some(origin=>!isExplicitHttpsOrigin(origin))) throw new Error('Production CORS origins must be explicit HTTPS public origins.');
    if(isLoopbackHost(parsed.SMTP_HOST)||isPlaceholderHost(parsed.SMTP_HOST)) throw new Error('Production SMTP_HOST must be a remote mail server, not loopback or a placeholder domain.');
    if(parsed.SMTP_PORT===1025) throw new Error('Production cannot use the development Mailpit SMTP port.');
    if(parsed.SMTP_PORT===465&&parsed.SMTP_SECURE!=='true') throw new Error('Production SMTP port 465 requires SMTP_SECURE=true.');
    if(!parsed.SMTP_FROM.includes('@')||/development|ma-safaris\.local|(?:^|[.@])example(?:\.|$)/i.test(parsed.SMTP_FROM)) throw new Error('Production SMTP_FROM must use an approved sender domain.');
    if(parsed.STORAGE_DRIVER==='local'&&!isAbsolute(parsed.LOCAL_PRIVATE_STORAGE_PATH)) throw new Error('Production local private storage must use an absolute path writable by the service account.');
    if(parsed.STORAGE_DRIVER==='s3') throw new Error('S3 requires a configured verified storage adapter; local-only baseline currently selected.');
  }
  return parsed;
}
export const config=parseConfig(process.env);
export const privateStoragePath=resolve(import.meta.dirname,'../../../',config.LOCAL_PRIVATE_STORAGE_PATH);

/**
 * CORS origin policy.
 *
 * Explicit origins always win. In development we additionally accept any
 * loopback host on any port so that a local dev server (Next on 3100, Expo web
 * on 8081, a LAN tunnel, …) can talk to the API without editing `.env` on every
 * port change. Production is unaffected: only `ALLOWED_WEB_ORIGINS` is honoured
 * and wildcards are rejected at boot.
 */
const LOOPBACK_ORIGIN_DEV=/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(?::\d+)?$/;
export function isAllowedWebOrigin(origin?:string):boolean {
  if(!origin) return true; // same-origin, curl, native apps: no Origin header.
  if(config.ALLOWED_WEB_ORIGINS.split(',').map(v=>v.trim()).filter(Boolean).includes(origin)) return true;
  return config.NODE_ENV!=='production'&&LOOPBACK_ORIGIN_DEV.test(origin);
}
