import { createHmac,timingSafeEqual,randomUUID } from 'node:crypto';
import { Prisma,type PrismaClient } from '@ma/database';
import { AuthService } from './auth.js';
import { CommerceService,bookingInclude,paymentSummary } from './commerce.js';
import { config } from './config.js';
import { allowed,customer,command,transaction,audit,emit,hash,reference, type Actor,type Command,type Tx } from './core.js';
import { DomainError,fail,requireValue,checkVersion } from './errors.js';
import { minor,serialize } from './money.js';
import { SnippePaymentAdapter } from './snippe.js';
export interface VerifiedPaymentEvent {eventId:string;intentId?:string;refundId?:string;merchantReference:string;amountMinor:string;currency:string;status:'CAPTURED'|'FAILED'|'PENDING'|'EXPIRED'|'REFUNDED';providerReference:string;}
export interface PaymentIntentRequest {
 id:string;merchantReference:string;amountMinor:bigint;currency:string;
 customer:{name:string;email:string;phone?:string|null};
 webhookUrl:string;
 fxRate?:string;
}
export interface PaymentIntentResult {
 type:string;intentId:string;providerTransactionId?:string;expiresAt?:Date;
 providerAmountMinor?:string;providerCurrency?:string;ledgerAmountMinor?:string;ledgerCurrency?:string;fxRate?:string;
 nextAction?:Record<string,unknown>;
}
export interface PaymentAdapter {
 capabilities:{development:boolean;methods:string[];refunds:boolean};
 createIntent(intent:PaymentIntentRequest):Promise<PaymentIntentResult>;
 queryStatus(intentId:string):Promise<VerifiedPaymentEvent|null>;
 verifyWebhook(raw:Buffer,signature:string,timestamp:string):VerifiedPaymentEvent|null;
 normalizeEvent(event:VerifiedPaymentEvent):VerifiedPaymentEvent;
 requestRefund(refund:{id:string;amountMinor:bigint;currency:string}):Promise<VerifiedPaymentEvent>;
}
export class MockPaymentAdapter implements PaymentAdapter {
 capabilities={development:true,methods:['MOCK_CHECKOUT'],refunds:true};constructor(private db:PrismaClient){}
 async createIntent(intent:PaymentIntentRequest):Promise<PaymentIntentResult> {return {type:'DEVELOPMENT_CHECKOUT',intentId:intent.id,nextAction:{type:'DEVELOPMENT_CHECKOUT',intentId:intent.id}};}
 async queryStatus(intentId:string) {const intent=await this.db.paymentIntent.findUnique({where:{id:intentId},include:{attempts:true}});if(!intent)return null;const data=intent.attempts[0]?.safeMetadata as {mockQueryStatus?:string}|undefined;if(data?.mockQueryStatus!=='CAPTURED')return null;return {eventId:`reconcile-${intent.id}`,intentId:intent.id,merchantReference:intent.merchantReference,amountMinor:intent.amountMinor.toString(),currency:intent.currency,status:'CAPTURED' as const,providerReference:`mock-capture-${intent.id}`};}
 signature(raw:Buffer,timestamp:string) {return createHmac('sha256',config.MOCK_WEBHOOK_SECRET).update(timestamp+'.').update(raw).digest('hex');}
 verifyWebhook(raw:Buffer,signature:string,timestamp:string) {if(!/^\d+$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300)fail(401,'WEBHOOK_INVALID','Invalid payment event.');const expected=Buffer.from(this.signature(raw,timestamp),'hex');const received=Buffer.from(signature,'hex');if(received.length!==expected.length||!timingSafeEqual(received,expected))fail(401,'WEBHOOK_INVALID','Invalid payment event.');let parsed:VerifiedPaymentEvent;try{parsed=JSON.parse(raw.toString('utf8')) as VerifiedPaymentEvent;}catch{fail(400,'VALIDATION_FAILED','Malformed payment event.');}if(!parsed.eventId||!parsed.merchantReference||!parsed.providerReference||!['CAPTURED','FAILED','PENDING','EXPIRED','REFUNDED'].includes(parsed.status)||!/^\d{1,16}$/.test(parsed.amountMinor)||!/^[A-Z]{3}$/.test(parsed.currency))fail(422,'VALIDATION_FAILED','Malformed normalized payment event.');return parsed;}
 normalizeEvent(event:VerifiedPaymentEvent) {return event;}
 async requestRefund(refund:{id:string;amountMinor:bigint;currency:string}) {return {eventId:`refund-${refund.id}`,refundId:refund.id,merchantReference:`refund-${refund.id}`,amountMinor:refund.amountMinor.toString(),currency:refund.currency,status:'REFUNDED' as const,providerReference:`mock-refund-${refund.id}`};}
}
function sameProviderReference(stored:string|null,event:string):boolean {
 if(!stored) return false;
 const normalize=(value:string)=>value.trim().replace(/^(?:pi|pay|pmt)_/,'');
 return stored.trim()===event.trim()||normalize(stored)===normalize(event);
}
export async function reconcileVerifiedEvent(db:PrismaClient,event:VerifiedPaymentEvent,payloadHash:string,provider='mock') {
 return transaction(db,async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${provider+':'+event.eventId},0))`;
  const existing=await tx.providerEvent.findUnique({where:{provider_eventId:{provider,eventId:event.eventId}}});
  if(existing){if(existing.payloadHash!==payloadHash)fail(409,'PROVIDER_EVENT_CONFLICT','A verified event identifier was reused with different content.');return {verified:true,duplicate:true,state:existing.state};}
  const record=await tx.providerEvent.create({data:{provider,eventId:event.eventId,verified:true,payloadHash,metadata:serialize(event) as unknown as Prisma.InputJsonValue}});
  const finish=(state:string,error?:string)=>tx.providerEvent.update({where:{id:record.id},data:{state,error,processedAt:new Date()}});
  if(event.status==='REFUNDED') {
   const refund=event.refundId?await tx.refund.findUnique({where:{id:event.refundId},include:{posting:true}}):null;
   if(!refund||refund.amountMinor!==minor(event.amountMinor)||refund.currency!==event.currency||event.merchantReference!==`refund-${refund.id}`||!['APPROVED','PENDING','SETTLED'].includes(refund.state)){await finish('QUARANTINED','REFUND_MISMATCH');return {verified:true,state:'QUARANTINED'};}
   await tx.$queryRaw`SELECT id FROM "PaymentPosting" WHERE id=${refund.postingId}::uuid FOR UPDATE`;
   const posting=await tx.refundPosting.findUnique({where:{refundId:refund.id}});if(!posting)await tx.refundPosting.create({data:{refundId:refund.id,amountMinor:refund.amountMinor,currency:refund.currency,provider,providerReference:event.providerReference,settledAt:new Date()}});
   await tx.refund.update({where:{id:refund.id},data:{state:'SETTLED',providerReference:event.providerReference,version:{increment:1}}});await finish('PROCESSED');await emit(tx,'refund.settled',refund.id,1,{bookingId:refund.bookingId,refundId:refund.id});return {verified:true,state:'SETTLED',refundId:refund.id};
  }
  let intent=event.intentId?await tx.paymentIntent.findUnique({where:{id:event.intentId}}):null;
  if(!intent&&provider!=='mock'&&event.merchantReference)intent=await tx.paymentIntent.findFirst({where:{merchantReference:event.merchantReference,provider}});
  if(!intent&&provider!=='mock')intent=await tx.paymentIntent.findFirst({where:{provider,attempts:{some:{providerTransactionId:event.providerReference}}}});
  if(!intent){await finish('QUARANTINED','UNKNOWN_INTENT');return {verified:true,state:'QUARANTINED'};}
  let attempt:{safeMetadata:unknown}|null=null;
  if(provider!=='mock'){
   const attempts=await tx.paymentAttempt.findMany({where:{intentId:intent.id,provider}});
   attempt=attempts.find(row=>row.providerTransactionId===event.providerReference)??attempts.find(row=>sameProviderReference(row.providerTransactionId,event.providerReference))??null;
   if(!attempt){await finish('QUARANTINED','UNKNOWN_PROVIDER_REFERENCE');return {verified:true,state:'QUARANTINED',intentId:intent.id};}
  }
  await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${intent.bookingId}::uuid FOR UPDATE`;
  const b=requireValue(await tx.booking.findUnique({where:{id:intent.bookingId},include:bookingInclude}));
  let mismatch=intent.merchantReference!==event.merchantReference&&Boolean(event.merchantReference);
  if(provider==='mock') mismatch||=intent.amountMinor!==minor(event.amountMinor)||intent.currency!==event.currency;
  else {
   const meta=(attempt?.safeMetadata&&typeof attempt.safeMetadata==='object'?attempt.safeMetadata:{}) as Record<string,unknown>;
   const providerAmount=typeof meta.providerAmountMinor==='string'&&/^\d{1,16}$/.test(meta.providerAmountMinor)?meta.providerAmountMinor:null;
   const providerCurrency=typeof meta.providerCurrency==='string'?meta.providerCurrency:null;
   if(!providerAmount||!providerCurrency) mismatch=true;
   else mismatch||=minor(providerAmount)!==minor(event.amountMinor)||providerCurrency!==event.currency;
   if(meta.ledgerAmountMinor!==undefined){const ledger=typeof meta.ledgerAmountMinor==='string'&&/^\d{1,16}$/.test(meta.ledgerAmountMinor)?meta.ledgerAmountMinor:null;if(!ledger||minor(ledger)!==intent.amountMinor||meta.ledgerCurrency!==intent.currency)mismatch=true;}
  }
  if(mismatch){await finish('QUARANTINED','PAYMENT_MISMATCH');await tx.booking.update({where:{id:b.id},data:{financeException:'PAYMENT_MISMATCH',version:{increment:1}}});return {verified:true,state:'QUARANTINED',intentId:intent.id};}
  const capture=await tx.paymentPosting.findFirst({where:{intentId:intent.id}});
  if(event.status==='CAPTURED') {
   if(!capture){const posting=await tx.paymentPosting.create({data:{bookingId:b.id,intentId:intent.id,amountMinor:intent.amountMinor,currency:intent.currency,provider,providerReference:event.providerReference,settledAt:new Date()}});const doc=await tx.document.create({data:{customerId:b.customerId,bookingId:b.id,postingId:posting.id,type:'RECEIPT',sourceVersion:posting.id,logicalKey:`receipt:${posting.id}`}});await emit(tx,'payment.captured',b.id,b.version+1,{bookingId:b.id,paymentPostingId:posting.id,documentId:doc.id,customerId:b.customerId});}
   let exception:string|undefined;if(['CANCELLED','DECLINED'].includes(b.status))exception='LATE_CAPTURE_REFUND_REVIEW';
   const reservation=b.reservations[0];if(reservation){if(reservation.state==='RELEASED'||reservation.state==='HELD'&&reservation.expiresAt!<new Date()){await tx.departureReservation.update({where:{id:reservation.id},data:{state:'RELEASED'}});exception='LATE_CAPTURE_CAPACITY_REVIEW';}else await tx.departureReservation.update({where:{id:reservation.id},data:{state:'PAID',expiresAt:null}});}
   await tx.paymentIntent.update({where:{id:intent.id},data:{state:'CAPTURED',reservationMinor:0n,version:{increment:1}}});await tx.paymentAttempt.updateMany({where:{intentId:intent.id},data:{state:'CAPTURED'}});if(!capture)await tx.booking.update({where:{id:b.id},data:{version:{increment:1},financeException:exception??(b.financeException==='PAYMENT_MISMATCH'?null:undefined)}});await finish('PROCESSED');return {verified:true,state:'CAPTURED',status:'CAPTURED',intentId:intent.id};
  }
  if(capture){await finish('CONFLICT_IGNORED','SETTLED_CAPTURE_RETAINED');return {verified:true,state:'CAPTURED',status:'CAPTURED',intentId:intent.id};}
  const state=event.status==='PENDING'?'PENDING':event.status;await tx.paymentIntent.update({where:{id:intent.id},data:{state,reservationMinor:state==='PENDING'?intent.reservationMinor:0n,version:{increment:1}}});await tx.paymentAttempt.updateMany({where:{intentId:intent.id},data:{state}});await finish('PROCESSED');return {verified:true,state,status:state,intentId:intent.id};
 });
}
export function createPaymentAdapter(db:PrismaClient):PaymentAdapter {
 return config.PAYMENT_PROVIDER==='snippe'?new SnippePaymentAdapter(db):new MockPaymentAdapter(db);
}
export async function reconcilePendingPayments(db:PrismaClient,adapter:PaymentAdapter=createPaymentAdapter(db),provider=config.PAYMENT_PROVIDER) {
 const pending=await db.paymentIntent.findMany({where:{provider,state:{in:['PENDING','UNKNOWN','PROCESSING']}},take:50});
 for(const intent of pending){const event=await adapter.queryStatus(intent.id).catch(()=>null);if(event)await reconcileVerifiedEvent(db,event,hash(JSON.stringify(event)),provider);}
}
export class FinanceService {
 private adapter:PaymentAdapter;
 constructor(public db:PrismaClient,private commerce:CommerceService,private auth:AuthService){this.adapter=createPaymentAdapter(db);}
 async createIntent(actor:Actor,id:string,input:{purpose:'DEPOSIT'|'FULL'|'BALANCE';method?:string;returnPath?:string},opts:Command) {
  customer(actor,true);
  const method=input.method??this.adapter.capabilities.methods[0];
  if(!method||!this.adapter.capabilities.methods.includes(method))fail(503,'INTEGRATION_DISABLED','The selected payment method is not configured.');
  if(input.returnPath&&!/^\/(customer|portal)\/(payments|bookings)(\/[^?#]*)?$/.test(input.returnPath))fail(422,'VALIDATION_FAILED','Return path is not allowed.');
  const result=await command(this.db,actor,'payment.intent:'+id,input,opts,async tx=>{await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${id}::uuid FOR UPDATE`;const b=await this.commerce.booking(tx,actor,id);if(!['REQUESTED','CONFIRMED'].includes(b.status))fail(409,'PAYMENT_NOT_REQUIRED','This booking does not accept new payments.');if(b.financeException&&b.financeException!=='APPROVED_UNPAID_EXCEPTION')fail(409,'PAYMENT_RECONCILIATION_REQUIRED','Operations must review the payment exception first.');const pending=await tx.paymentIntent.findFirst({where:{bookingId:id,state:{in:['PENDING','UNKNOWN','PROCESSING']}}});if(pending)fail(409,'PAYMENT_ALREADY_PENDING','A payment is awaiting verification.',{intentId:pending.id});
   const summary=paymentSummary(b),policy=b.policySnapshot as {balanceDaysBefore:number};const short=b.startDate<=new Date(Date.now()+(policy.balanceDaysBefore??7)*86400000);const amount=input.purpose==='DEPOSIT'&&!short?summary.depositDue:summary.balanceDue;if(amount<=0n)fail(409,'PAYMENT_NOT_REQUIRED','No payment is currently required.');
   if(!this.adapter.capabilities.development&&b.currency!=='TZS'){
    if(b.currency!=='USD')fail(422,'VALIDATION_FAILED','Snippe collects TZS only. This booking must be priced in TZS or USD.');
    if(!(config.SNIPPE_TZS_PER_USD>0))fail(422,'PAYMENT_CONFIGURATION','USD payments need an approved TZS-per-USD rate. Ask Operations to set SNIPPE_TZS_PER_USD before collecting payment.');
   }
   const fxRate=!this.adapter.capabilities.development&&b.currency==='USD'?String(config.SNIPPE_TZS_PER_USD):undefined;
   const reservation=b.reservations[0];if(reservation&&(reservation.state==='RELEASED'||reservation.state==='HELD'&&reservation.expiresAt!<new Date()))fail(409,'RESOURCE_UNAVAILABLE','Departure hold expired. Ask Operations to review capacity.');
   const intent=await tx.paymentIntent.create({data:{bookingId:id,customerId:b.customerId,purpose:short?'FULL':input.purpose,amountMinor:amount,currency:b.currency,provider:config.PAYMENT_PROVIDER,merchantReference:reference('PAY'),expiresAt:new Date(Date.now()+1800000),reservationMinor:amount,attempts:{create:{provider:config.PAYMENT_PROVIDER,nextAction:{type:this.adapter.capabilities.development?'DEVELOPMENT_CHECKOUT':'MOBILE_MONEY_PUSH'},...(this.adapter.capabilities.development?{providerTransactionId:randomUUID()}:{safeMetadata:serialize({fxRate}) as Prisma.InputJsonValue})}}}});await audit(tx,actor,'payment.intent_created','PaymentIntent',intent.id,{bookingId:id,purpose:intent.purpose,amountMinor:amount.toString(),provider:config.PAYMENT_PROVIDER,...(fxRate?{fxRate}:{})});return intent;
  });
  const intentId=(result as {id:string}).id;
  if(this.adapter.capabilities.development)return this.intentProjection(await this.intentById(intentId));
  return this.startProviderIntent(intentId);
 }
 private intentById(id:string) {return this.db.paymentIntent.findUniqueOrThrow({where:{id},include:{customer:true,attempts:{orderBy:{createdAt:'desc' as const}}}});}
 private async startProviderIntent(intentId:string) {
  const row=await this.intentById(intentId);
  const attempt=row.attempts[0];
  if(!attempt||attempt.providerTransactionId||['CAPTURED','EXPIRED','FAILED'].includes(row.state))return this.intentProjection(row);
  const metadata=(attempt.safeMetadata&&typeof attempt.safeMetadata==='object'?attempt.safeMetadata:{}) as Record<string,unknown>;
  const fxRate=typeof metadata.fxRate==='string'?metadata.fxRate:undefined;
  try {
   const result=await this.adapter.createIntent({id:row.id,merchantReference:row.merchantReference,amountMinor:row.amountMinor,currency:row.currency,customer:{name:row.customer?.name??'Customer',email:row.customer?.email??'',phone:row.customer?.phone},webhookUrl:`${config.PUBLIC_API_BASE_URL}/webhooks/payments/${config.PAYMENT_PROVIDER}`,...(fxRate?{fxRate}:{})});
   await transaction(this.db,async tx=>{
    await tx.paymentAttempt.update({where:{id:attempt.id},data:{state:'PENDING',providerTransactionId:result.providerTransactionId??null,nextAction:serialize(result.nextAction??{}) as Prisma.InputJsonValue,safeMetadata:serialize({...metadata,providerReference:result.providerTransactionId??null,providerAmountMinor:result.providerAmountMinor??null,providerCurrency:result.providerCurrency??null,ledgerAmountMinor:result.ledgerAmountMinor??null,ledgerCurrency:result.ledgerCurrency??null,fxRate:result.fxRate??fxRate??null}) as Prisma.InputJsonValue}});
    await tx.paymentIntent.update({where:{id:row.id},data:{state:'PENDING',...(result.expiresAt&&result.expiresAt>new Date()?{expiresAt:result.expiresAt}:{}),version:{increment:1}}});
   });
  } catch(error) {
   const ambiguous=error instanceof DomainError&&error.details.ambiguous===true;
   const providerReference=error instanceof DomainError&&typeof error.details.providerReference==='string'?error.details.providerReference:undefined;
   await transaction(this.db,async tx=>{
    await tx.paymentAttempt.update({where:{id:attempt.id},data:{state:ambiguous?'UNKNOWN':'FAILED',...(providerReference?{providerTransactionId:providerReference}:{}),safeMetadata:{...metadata,providerReference:providerReference??null,providerRequestFailed:true,retryable:ambiguous}}});
    await tx.paymentIntent.update({where:{id:row.id},data:{state:ambiguous?'UNKNOWN':'FAILED',version:{increment:1}}});
   }).catch(()=>undefined);
   throw error;
  }
  return this.intentProjection(await this.intentById(row.id));
 }
 private intentProjection(i:{id:string;bookingId:string;purpose:string;amountMinor:bigint|string;currency:string;state:string;provider:string;expiresAt:Date|string;version?:number;attempts?:Array<{nextAction:unknown}>}) {return {id:i.id,bookingId:i.bookingId,purpose:i.purpose,amount:{currency:i.currency,minor:String(i.amountMinor)},status:i.state,state:i.state,provider:i.provider,...(i.version!==undefined?{version:i.version}:{}),nextAction:i.attempts?.[0]?.nextAction??{type:i.provider==='mock'?'DEVELOPMENT_CHECKOUT':'MOBILE_MONEY_PUSH',intentId:i.id},expiresAt:i.expiresAt};}
 async intent(actor:Actor,id:string) {if(actor.role!=='CUSTOMER')allowed(actor,'finance.read');const intent=requireValue(await this.db.paymentIntent.findFirst({where:{id,...(actor.role==='CUSTOMER'?{customerId:customer(actor)}:{})},include:{attempts:{orderBy:{createdAt:'desc' as const}}}}));return this.intentProjection(intent);}
 async simulate(actor:Actor,id:string,input:{scenario:string}) {if(config.NODE_ENV==='production'||config.ENABLE_DEV_PAYMENT_SIMULATION!=='true'||!(this.adapter instanceof MockPaymentAdapter))fail(404,'NOT_FOUND','Unavailable.');const owner=customer(actor,true);const intent=requireValue(await this.db.paymentIntent.findFirst({where:{id,customerId:owner,provider:'mock'}}));
  if(['TIMEOUT','DELAYED_SUCCESS'].includes(input.scenario)){await this.db.paymentIntent.update({where:{id},data:{state:'UNKNOWN'}});await this.db.paymentAttempt.updateMany({where:{intentId:id},data:{safeMetadata:{mockQueryStatus:'CAPTURED'},state:'UNKNOWN'}});return {intentId:id,status:'PENDING',verified:false};}
  const status=input.scenario==='FAILURE'?'FAILED':input.scenario==='PENDING'?'PENDING':input.scenario==='EXPIRED'?'EXPIRED':'CAPTURED';
  const event:VerifiedPaymentEvent={eventId:input.scenario==='DUPLICATE'?`success-${id}`:status==='CAPTURED'&&input.scenario==='SUCCESS'?`success-${id}`:`${input.scenario}-${id}-${randomUUID()}`,intentId:id,merchantReference:intent.merchantReference,amountMinor:(input.scenario==='WRONG_AMOUNT'?intent.amountMinor+1n:intent.amountMinor).toString(),currency:input.scenario==='WRONG_CURRENCY'?'EUR':intent.currency,status,providerReference:`mock-capture-${id}`};const raw=Buffer.from(JSON.stringify(event)),timestamp=String(Math.floor(Date.now()/1000));return this.webhook(raw,(this.adapter as MockPaymentAdapter).signature(raw,timestamp),timestamp);
 }
 async webhook(raw:Buffer,signature:string,timestamp:string) {if(config.PAYMENT_PROVIDER==='disabled')fail(404,'INTEGRATION_DISABLED','No provider is configured.');const verified=this.adapter.verifyWebhook(raw,signature,timestamp);if(!verified)return {verified:true,ignored:true};const event=this.adapter.normalizeEvent(verified);return reconcileVerifiedEvent(this.db,event,hash(raw.toString('utf8')),config.PAYMENT_PROVIDER);}
 async offlineRecord(actor:Actor,input:{bookingId:string;reference:string;method:string;amountMinor:string;currency:string;evidence:Prisma.InputJsonValue}) {allowed(actor,'finance.offline_record');return transaction(this.db,async tx=>{const b=await this.commerce.booking(tx,actor,input.bookingId);if(b.currency!==input.currency)fail(422,'VALIDATION_FAILED','Currency must match the booking.');if(minor(input.amountMinor)<=0n)fail(422,'VALIDATION_FAILED','Payment amount must be positive.');const row=await tx.offlinePaymentRecord.create({data:{...input,amountMinor:minor(input.amountMinor),submittedBy:actor.id}});await audit(tx,actor,'finance.offline_record','OfflinePaymentRecord',row.id,{bookingId:b.id,reference:row.reference});return row;});}
 async verifyOffline(actor:Actor,id:string,input:{reason:string},opts:Command) {allowed(actor,'finance.offline_verify');return command(this.db,actor,'offline.verify:'+id,input,opts,async tx=>{await this.auth.consumeReauth(tx,actor,'finance.offline_verify',opts.reauthToken);const row=requireValue(await tx.offlinePaymentRecord.findUnique({where:{id}}));if(row.state!=='UNVERIFIED')fail(409,'INVALID_TRANSITION','This offline record was already verified.');await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${row.bookingId}::uuid FOR UPDATE`;await tx.offlinePaymentRecord.update({where:{id},data:{state:'VERIFIED',verifiedBy:actor.id,verifiedAt:new Date(),reason:input.reason}});const posting=await tx.paymentPosting.create({data:{bookingId:row.bookingId,offlineRecordId:id,amountMinor:row.amountMinor,currency:row.currency,provider:'offline',providerReference:row.reference,settledAt:new Date()}});const b=requireValue(await tx.booking.update({where:{id:row.bookingId},data:{version:{increment:1}}}));await tx.document.create({data:{customerId:b.customerId,bookingId:b.id,postingId:posting.id,type:'RECEIPT',sourceVersion:posting.id,logicalKey:`receipt:${posting.id}`}});await emit(tx,'payment.captured',b.id,b.version,{bookingId:b.id,paymentPostingId:posting.id,customerId:b.customerId});await audit(tx,actor,'finance.offline_verify','OfflinePaymentRecord',id,{postingId:posting.id},input.reason);return posting;});}
 async adjustment(actor:Actor,id:string,input:{expectedVersion:number;amountMinor:string;direction:'DEBIT'|'CREDIT';reason:string;type:string},opts:Command) {allowed(actor,'finance.adjustment');return command(this.db,actor,'finance.adjustment:'+id,input,opts,async tx=>{await this.auth.consumeReauth(tx,actor,'finance.adjustment',opts.reauthToken);const b=await this.commerce.booking(tx,actor,id);checkVersion(b.version,input.expectedVersion);const amount=minor(input.amountMinor);if(input.direction==='CREDIT'&&amount>paymentSummary(b).contractTotal)fail(422,'VALIDATION_FAILED','Credit exceeds the contract.');const result=await tx.financialAdjustment.create({data:{bookingId:id,amountMinor:amount,direction:input.direction,currency:b.currency,type:input.type,reason:input.reason,approvedBy:actor.id,reference:reference('ADJ')}});await tx.booking.update({where:{id},data:{version:{increment:1}}});await audit(tx,actor,'finance.adjustment','Booking',id,{adjustmentId:result.id,direction:input.direction,amountMinor:input.amountMinor},input.reason);return result;});}
 async requestRefund(actor:Actor,input:{postingId:string;amountMinor:string;reason:string},opts:Command) {allowed(actor,'refund.approve');return command(this.db,actor,'refund.request',input,opts,async tx=>{await tx.$queryRaw`SELECT id FROM "PaymentPosting" WHERE id=${input.postingId}::uuid FOR UPDATE`;const posting=requireValue(await tx.paymentPosting.findUnique({where:{id:input.postingId},include:{refunds:true}}));const amount=minor(input.amountMinor),reserved=posting.refunds.filter(r=>!['REJECTED','FAILED','CANCELLED'].includes(r.state)).reduce((s,r)=>s+r.amountMinor,0n);if(amount<=0n||amount>posting.amountMinor-reserved)fail(409,'REFUND_LIMIT_EXCEEDED','Refund exceeds remaining captured funds.');const b=await this.commerce.booking(tx,actor,posting.bookingId);if(amount>paymentSummary(b).refundDue)fail(409,'FINANCIAL_DISPOSITION_REQUIRED','Record the approved contract reduction before requesting a refund.');const result=await tx.refund.create({data:{bookingId:posting.bookingId,postingId:posting.id,amountMinor:amount,currency:posting.currency,reason:input.reason,requestedBy:actor.id}});await audit(tx,actor,'refund.requested','Refund',result.id,{postingId:posting.id},input.reason);return result;});}
 async approveRefund(actor:Actor,id:string,input:{expectedVersion:number;reason:string},opts:Command) {allowed(actor,'refund.approve');const pending=await command(this.db,actor,'refund.approve:'+id,input,opts,async tx=>{await this.auth.consumeReauth(tx,actor,'refund.approve',opts.reauthToken);const refund=requireValue(await tx.refund.findUnique({where:{id}}));checkVersion(refund.version,input.expectedVersion);if(refund.state!=='REQUESTED')fail(409,'INVALID_TRANSITION','Only requested refunds can be approved.');const result=await tx.refund.update({where:{id},data:{state:'PENDING',approvedBy:actor.id,approvedAt:new Date(),version:{increment:1}}});await audit(tx,actor,'refund.approved','Refund',id,{amountMinor:refund.amountMinor.toString(),automatic:this.adapter.capabilities.refunds},input.reason);return result;});if(!this.adapter.capabilities.refunds)return requireValue(await this.db.refund.findUnique({where:{id},include:{postings:true}}));const refund=pending as {id:string;amountMinor:bigint|string;currency:string};const event=await this.adapter.requestRefund({...refund,amountMinor:BigInt(refund.amountMinor)});const raw=Buffer.from(JSON.stringify(event)),timestamp=String(Math.floor(Date.now()/1000));await this.webhook(raw,(this.adapter as MockPaymentAdapter).signature(raw,timestamp),timestamp);return requireValue(await this.db.refund.findUnique({where:{id},include:{postings:true}}));}
 async settleRefund(actor:Actor,id:string,input:{expectedVersion:number;providerReference:string;reason:string},opts:Command) {allowed(actor,'refund.approve');if(this.adapter.capabilities.refunds)fail(409,'INVALID_TRANSITION','This provider settles approved refunds automatically.');return command(this.db,actor,'refund.settle:'+id,input,opts,async tx=>{await this.auth.consumeReauth(tx,actor,'refund.approve',opts.reauthToken);const refund=requireValue(await tx.refund.findUnique({where:{id}}));checkVersion(refund.version,input.expectedVersion);if(refund.state!=='PENDING')fail(409,'INVALID_TRANSITION','Only an approved refund can be settled manually.');await tx.$queryRaw`SELECT id FROM "PaymentPosting" WHERE id=${refund.postingId}::uuid FOR UPDATE`;await tx.refundPosting.create({data:{refundId:refund.id,amountMinor:refund.amountMinor,currency:refund.currency,provider:config.PAYMENT_PROVIDER,providerReference:input.providerReference,settledAt:new Date()}});const result=await tx.refund.update({where:{id},data:{state:'SETTLED',providerReference:input.providerReference,version:{increment:1}}});await audit(tx,actor,'refund.settled_manually','Refund',id,{providerReference:input.providerReference,amountMinor:refund.amountMinor.toString()},input.reason);await emit(tx,'refund.settled',refund.id,refund.version+1,{bookingId:refund.bookingId,refundId:refund.id});return result;});}
 async voidIntent(actor:Actor,id:string,input:{expectedVersion:number;reason:string},opts:Command) {allowed(actor,'finance.adjustment');return command(this.db,actor,'payment.void:'+id,input,opts,async tx=>{await this.auth.consumeReauth(tx,actor,'finance.adjustment',opts.reauthToken);await tx.$queryRaw`SELECT id FROM "PaymentIntent" WHERE id=${id}::uuid FOR UPDATE`;const intent=requireValue(await tx.paymentIntent.findUnique({where:{id}}));checkVersion(intent.version,input.expectedVersion);if(!['PENDING','UNKNOWN','PROCESSING'].includes(intent.state))fail(409,'INVALID_TRANSITION','Only an open payment intent can be voided.');if(await tx.paymentPosting.findFirst({where:{intentId:id}}))fail(409,'INVALID_TRANSITION','This payment is already captured. Reconcile it instead of voiding.');const result=await tx.paymentIntent.update({where:{id},data:{state:'FAILED',reservationMinor:0n,version:{increment:1}}});await tx.paymentAttempt.updateMany({where:{intentId:id},data:{state:'FAILED'}});await audit(tx,actor,'payment.voided','PaymentIntent',id,{bookingId:intent.bookingId,provider:intent.provider},input.reason);return result;});}
 async rejectRefund(actor:Actor,id:string,input:{expectedVersion:number;reason:string}) {allowed(actor,'refund.approve');return transaction(this.db,async tx=>{const r=requireValue(await tx.refund.findUnique({where:{id}}));checkVersion(r.version,input.expectedVersion);if(r.state!=='REQUESTED')fail(409,'INVALID_TRANSITION','Only a requested refund can be rejected.');const result=await tx.refund.update({where:{id},data:{state:'REJECTED',reason:input.reason,version:{increment:1}}});await audit(tx,actor,'refund.rejected','Refund',id,{},input.reason);return result;});}
}
