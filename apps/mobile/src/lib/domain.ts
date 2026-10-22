export type Role = 'CUSTOMER'|'OPERATIONS'|'DRIVER_GUIDE'|'ADMIN';
export type Locale = 'en'|'sw';
export interface User {id:string; email:string; name:string; locale:Locale; version:number; status:string; emailVerified:boolean; roles:Role[]; permissions:string[]; customerId?:string; guideId?:string; phone?:string}
export interface LoginResult {accessToken:string; refreshToken:string; expiresIn:number; user:User}
export type RecordData = Record<string, unknown>;
export function record(value: unknown): RecordData {return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordData : {};}
export function rows(value:unknown):RecordData[] {if(Array.isArray(value))return value.map(record);const r=record(value);if(Array.isArray(r.data))return r.data.map(record);return Array.isArray(r.items)?r.items.map(record):[];}
export function str(value:unknown,fallback=''):string {return typeof value==='string'?value:typeof value==='number'?String(value):fallback;}
export function num(value:unknown,fallback=0):number {return typeof value==='number'?value:Number.isFinite(Number(value))?Number(value):fallback;}
export const rolePath:Record<Role,string> = {CUSTOMER:'customer',OPERATIONS:'operations',DRIVER_GUIDE:'guide',ADMIN:'admin'};
export const roleHome:Record<Role,string> = {CUSTOMER:'/customer/explore',OPERATIONS:'/operations/today',DRIVER_GUIDE:'/guide/my-trips',ADMIN:'/admin/overview'};
export const stages=['SCHEDULED','EN_ROUTE_TO_PICKUP','PICKED_UP','SAFARI_STARTED','ACTIVITY_REACHED','RETURNING','COMPLETED'] as const;
export function nextStage(status:string):string|undefined {const i=stages.findIndex(s=>s===status);return i<0?undefined:stages[i+1];}
export function amount(value:unknown,currency='USD',locale:Locale='en'):string {
  const code=currency.toUpperCase();const digits=new Intl.NumberFormat('en',{style:'currency',currency:code}).resolvedOptions().maximumFractionDigits ?? 2;
  const minor=str(value,'0');if(!/^-?\d+$/.test(minor))return '—';
  return new Intl.NumberFormat(locale==='sw'?'sw-TZ':'en-TZ',{style:'currency',currency:code}).format(Number(minor)/10**digits);
}
export function date(value:unknown,locale:Locale='en',timezone='Africa/Dar_es_Salaam',time=false):string {const text=str(value);if(!text)return '—';const d=new Date(text.length===10?`${text}T12:00:00Z`:text);if(Number.isNaN(d.valueOf()))return text;return new Intl.DateTimeFormat(locale==='sw'?'sw-TZ':'en-GB',{timeZone:timezone,dateStyle:'medium',...(time?{timeStyle:'short'}:{})}).format(d);}
