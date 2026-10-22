import { createHash,randomUUID } from 'node:crypto';
import { createDatabase,Prisma, type PrismaClient } from '@ma/database';
import { fail,DomainError } from './errors.js';
import { serialize } from './money.js';
import type { Permission,Role } from './permissions.js';
import { sealEmail,type EmailPayload } from './sealed-email.js';
export type Tx=Prisma.TransactionClient;
export interface Actor {id:string;sessionId:string;role:Role;roles:Role[];permissions:Permission[];customerId?:string;guideId?:string;emailVerified:boolean;requestId:string;}
export interface Command {key?:string;reauthToken?:string;}
export const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])):v;
export const requestHash=(v:unknown)=>hash(JSON.stringify(canonical(v)));
export function allowed(actor:Actor,permission:Permission) {if(!actor.permissions.includes(permission))fail(403,'FORBIDDEN','This action is not permitted in your current role.');}
export function customer(actor:Actor,verified=false):string {if(actor.role!=='CUSTOMER'||!actor.customerId)fail(403,'FORBIDDEN','A customer context is required.');if(verified&&!actor.emailVerified)fail(403,'EMAIL_VERIFICATION_REQUIRED','Verify your email before submitting or paying.');return actor.customerId;}
export const staff=(actor:Actor)=>actor.role==='ADMIN'||actor.role==='OPERATIONS';
export const reference=(prefix:string)=>`${prefix}-${new Date().getUTCFullYear()}-${randomUUID().replaceAll('-','').slice(0,12).toUpperCase()}`;
export function date(value:string):Date {if(!/^\d{4}-\d{2}-\d{2}$/.test(value))fail(422,'VALIDATION_FAILED','Use YYYY-MM-DD dates');const d=new Date(value+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)fail(422,'VALIDATION_FAILED','Invalid calendar date');return d;}
export const addDays=(d:Date,days:number)=>new Date(d.getTime()+days*86400000);
export function requireFuture(d:Date) {const today=date(new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Dar_es_Salaam'}));if(d<today)fail(422,'VALIDATION_FAILED','Departure cannot be in the past',{field:'startDate'});}
export async function transaction<T>(db:PrismaClient,fn:(tx:Tx)=>Promise<T>):Promise<T> {
 for(let attempt=0;attempt<3;attempt++)try{return await db.$transaction(fn,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:5000,timeout:15000});}
 catch(e){if(e instanceof DomainError)throw e;const code=(e as {code?:string}).code;const text=String(e);if((code==='P2034'||/40001|40P01/.test(text))&&attempt<2)continue;if(/23P01|allocation_no_overlap|RESOURCE_UNAVAILABLE/.test(text))fail(409,'RESOURCE_UNAVAILABLE','A selected resource is no longer available for these dates.');if(code==='P2002')fail(409,'CONFLICT','This action conflicts with a record created concurrently.');if(code==='P1001'||code==='P1002')fail(503,'DEPENDENCY_UNAVAILABLE','The database is temporarily unavailable.');throw e;}
 throw new Error('Transaction retry exhausted');
}
export async function audit(tx:Tx,actor:Actor,action:string,entityType:string,entityId:string|undefined,summary:unknown={},reason?:string) {await tx.auditEvent.create({data:{actorId:actor.id,action,entityType,entityId,requestId:actor.requestId,summary:serialize(summary) as Prisma.InputJsonValue,reason}});}
export async function emit(tx:Tx,type:string,aggregateId:string,aggregateVersion:number,payload:unknown={},suffix='') {let secured=payload;if(payload&&typeof payload==='object'&&'email'in payload){const {email,...rest}=payload as {email:EmailPayload};secured={...rest,email:sealEmail(email)};}return tx.outboxEvent.upsert({where:{logicalKey:`${type}:${aggregateId}:${aggregateVersion}${suffix}`},create:{type,aggregateId,aggregateVersion,logicalKey:`${type}:${aggregateId}:${aggregateVersion}${suffix}`,payload:serialize(secured) as Prisma.InputJsonValue},update:{}});}
export async function command<T>(db:PrismaClient,actor:Actor,scope:string,input:unknown,options:Command,fn:(tx:Tx)=>Promise<T>):Promise<T> {
 const key=options.key;if(!key||key.length>128||key.length<8)fail(400,'IDEMPOTENCY_KEY_REQUIRED','Send a stable Idempotency-Key for this action.');
 const digest=requestHash(input);
 return transaction(db,async tx=>{
  // Advisory locks serialize identical keys; uniqueness remains the final defense.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.id+':'+scope+':'+key},0))`;
  const existing=await tx.idempotencyRecord.findUnique({where:{actorId_scope_key:{actorId:actor.id,scope,key}}});
  if(existing){if(existing.requestHash!==digest)fail(409,'IDEMPOTENCY_KEY_REUSED','This key was already used with a different request.');if(existing.state==='COMPLETE')return existing.response as T;fail(409,'ACTION_PENDING','This action is still processing. Refresh its status.');}
  const idempotency=await tx.idempotencyRecord.create({data:{actorId:actor.id,scope,key,requestHash:digest,expiresAt:addDays(new Date(),7)}});
  const result=await fn(tx);
  await tx.idempotencyRecord.update({where:{id:idempotency.id},data:{state:'COMPLETE',response:serialize(result) as Prisma.InputJsonValue,responseStatus:200}});
  return result;
 });
}
export class BaseService {constructor(public db:PrismaClient=createDatabase()){} }
export function pagination(query:Record<string,string|undefined>) {return {take:Math.min(50,Math.max(1,Number(query.limit)||20)),...(query.cursor?{cursor:{id:query.cursor},skip:1}:{}),orderBy:[{createdAt:'desc' as const},{id:'desc' as const}]};}
