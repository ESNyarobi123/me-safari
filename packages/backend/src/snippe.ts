import { createHmac,timingSafeEqual } from 'node:crypto';
import type { PrismaClient } from '@ma/database';
import { config } from './config.js';
import { DomainError,fail } from './errors.js';
import { currencyExponents } from './money.js';
import type { PaymentAdapter,PaymentIntentRequest,PaymentIntentResult,VerifiedPaymentEvent } from './finance.js';

const MAX_SAFE_AMOUNT=BigInt(Number.MAX_SAFE_INTEGER);
const SNIPPE_MIN_AMOUNT=500n;
const SNIPPE_EXPONENT=currencyExponents.TZS;
const SNIPPE_EVENT_STATUS:Record<string,'CAPTURED'|'FAILED'|'EXPIRED'>={ 'payment.completed':'CAPTURED','payment.failed':'FAILED','payment.voided':'EXPIRED','payment.expired':'EXPIRED' };
const SNIPPE_PAYMENT_STATUS:Record<string,VerifiedPaymentEvent['status']>={ pending:'PENDING',completed:'CAPTURED',failed:'FAILED',voided:'EXPIRED',expired:'EXPIRED' };

export interface SnippeOptions {
 apiKey:string;webhookSecret:string;baseUrl:string;timeoutMs:number;fetchImpl:typeof fetch;
}

/**
 * Snippe mobile-money collection adapter (API version 2026-01-25).
 *
 * A payment intent is created with `POST /v1/payments`; the traveller then
 * receives a USSD prompt and authorises with a PIN. Settlement is confirmed
 * only by a signature-verified webhook or an authenticated status query — the
 * frontend never marks a payment as paid.
 */
export class SnippePaymentAdapter implements PaymentAdapter {
 capabilities={development:false,methods:['MOBILE_MONEY'],refunds:false};
 private apiKey:string;
 private webhookSecret:string;
 private baseUrl:string;
 private timeoutMs:number;
 private fetchImpl:typeof fetch;

 constructor(private db:PrismaClient,options:Partial<SnippeOptions>={}) {
  this.apiKey=options.apiKey??config.SNIPPE_API_KEY;
  this.webhookSecret=options.webhookSecret??config.SNIPPE_WEBHOOK_SECRET;
  this.baseUrl=(options.baseUrl??config.SNIPPE_BASE_URL).replace(/\/+$/,'');
  this.timeoutMs=options.timeoutMs??config.SNIPPE_HTTP_TIMEOUT_MS;
  this.fetchImpl=options.fetchImpl??globalThis.fetch;
  if(!this.apiKey||!this.webhookSecret) throw new Error('Snippe credentials are not configured.');
 }

 async createIntent(input:PaymentIntentRequest):Promise<PaymentIntentResult> {
  const charge=providerCharge(input.amountMinor,input.currency,input.fxRate);
  if(charge.amountMinor<SNIPPE_MIN_AMOUNT) fail(422,'VALIDATION_FAILED','The minimum mobile-money payment is 500 TZS.');
  if(charge.amountMinor>MAX_SAFE_AMOUNT) fail(422,'VALIDATION_FAILED','The payment amount is too large for the provider.');
  const email=input.customer.email.trim();
  if(!email) fail(422,'VALIDATION_FAILED','Add an email address to the customer profile before paying.',{field:'email'});
  const phone=normalizeTzPhone(input.customer.phone);
  if(input.merchantReference.length>30) fail(500,'PAYMENT_CONFIGURATION','The merchant reference exceeds the provider idempotency-key limit.');
  const [firstname,...rest]=input.customer.name.trim().split(/\s+/).filter(Boolean);
  const lastname=rest.join(' ')||'Customer';
  const data=await this.send('/v1/payments',{
   method:'POST',
   body:JSON.stringify({
    payment_type:'mobile',
    details:{amount:Number(charge.amountMinor),currency:charge.currency},
    phone_number:phone,
    customer:{firstname:firstname||'Customer',lastname,email},
    webhook_url:input.webhookUrl,
    metadata:{intentId:input.id,merchantReference:input.merchantReference},
   }),
  },input.merchantReference);
  const reference=typeof data?.reference==='string'?data.reference.trim():'';
  if(!reference) fail(502,'PAYMENT_PROVIDER_ERROR','The payment provider returned an invalid payment reference.',{ambiguous:true});
  const returnedAmount=(data?.amount as {value?:unknown;currency?:unknown}|undefined);
  if(returnedAmount&&(minorString(returnedAmount.value)!==charge.amountMinor.toString()||returnedAmount.currency!==charge.currency)) fail(502,'PAYMENT_PROVIDER_ERROR','The payment provider accepted a different amount. Contact Operations before retrying.',{ambiguous:true,providerReference:reference});
  const expiresAt=data?.expires_at?new Date(String(data.expires_at)):undefined;
  const masked=maskPhone(phone);
  const amountLabel=formatProviderAmount(charge.amountMinor);
  const ledgerLabel=input.currency==='USD'?`USD ${formatMinor(input.amountMinor,currencyExponents.USD)}`:'';
  const conversion=charge.fxRate?` (${ledgerLabel} at 1 USD = ${charge.fxRate} TZS)`:'';
  return {
   type:'MOBILE_MONEY_PUSH',intentId:input.id,providerTransactionId:reference,
   ...(expiresAt&&Number.isFinite(expiresAt.getTime())?{expiresAt}:{}),
   providerAmountMinor:charge.amountMinor.toString(),providerCurrency:charge.currency,
   ledgerAmountMinor:input.amountMinor.toString(),ledgerCurrency:input.currency,
   ...(charge.fxRate?{fxRate:charge.fxRate}:{}),
   nextAction:{
    type:'MOBILE_MONEY_PUSH',providerReference:reference,phone:masked,method:'MOBILE_MONEY',
    amount:{currency:charge.currency,minor:charge.amountMinor.toString()},
    ledgerAmount:{currency:input.currency,minor:input.amountMinor.toString()},
    ...(charge.fxRate?{fxRate:charge.fxRate}:{}),
    instructions:`An authorisation prompt for TZS ${amountLabel}${conversion} was sent to ${masked}. Enter your mobile-money PIN on your phone to confirm this payment.`,
   },
  };
 }

 async queryStatus(intentId:string):Promise<VerifiedPaymentEvent|null> {
  const intent=await this.db.paymentIntent.findUnique({where:{id:intentId},include:{attempts:{where:{provider:'snippe',providerTransactionId:{not:null}},orderBy:{createdAt:'desc'}}}});
  const reference=intent?.attempts[0]?.providerTransactionId;
  if(!intent||!reference) return null;
  const data=await this.send(`/v1/payments/${encodeURIComponent(reference)}`,{method:'GET'});
  const status=SNIPPE_PAYMENT_STATUS[String(data?.status??'').toLowerCase()];
  const amountPayload=data?.amount as {value?:unknown;currency?:unknown}|undefined;
  const amount=minorString(amountPayload?.value),currency=typeof amountPayload?.currency==='string'?amountPayload.currency:'';
  if(!status||!amount||!currency) return null;
  return {eventId:`snippe-status-${reference}-${status}`,intentId:intent.id,merchantReference:intent.merchantReference,amountMinor:amount,currency,status,providerReference:reference};
 }

 verifyWebhook(raw:Buffer,signature:string,timestamp:string):VerifiedPaymentEvent|null {
  if(!/^\d+$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300) fail(401,'WEBHOOK_INVALID','Invalid payment event.');
  const expected=Buffer.from(this.signature(raw,timestamp),'hex'),received=Buffer.from(signature||'','hex');
  if(received.length!==expected.length||!timingSafeEqual(received,expected)) fail(401,'WEBHOOK_INVALID','Invalid payment event.');
  let parsed:{id?:unknown;type?:unknown;event?:unknown;api_version?:unknown;data?:unknown}&Record<string,unknown>;
  try { parsed=JSON.parse(raw.toString('utf8')) as typeof parsed; } catch { fail(400,'VALIDATION_FAILED','Malformed payment event.'); }
  const type=typeof parsed.type==='string'?parsed.type:typeof parsed.event==='string'?parsed.event:'';
  if(!type) fail(422,'VALIDATION_FAILED','Malformed payment event.');
  if(!type.startsWith('payment.')) return null;
  const data=(parsed.data&&typeof parsed.data==='object'?parsed.data:parsed) as Record<string,unknown>;
  const status=SNIPPE_EVENT_STATUS[type];
  const amount=minorString((data.amount as {value?:unknown}|undefined)?.value);
  const currency=typeof (data.amount as {currency?:unknown}|undefined)?.currency==='string'?(data.amount as {currency:string}).currency:'';
  const reference=typeof data.reference==='string'?data.reference.trim():'';
  if(!status||!amount||!currency||!reference) fail(422,'VALIDATION_FAILED','Malformed payment event.');
  const metadata=(data.metadata&&typeof data.metadata==='object'?data.metadata:{}) as Record<string,unknown>;
  const eventId=typeof parsed.id==='string'&&parsed.id?parsed.id:`${type}-${reference}-${status}`;
  return {
   eventId,intentId:typeof metadata.intentId==='string'?metadata.intentId:undefined,
   merchantReference:typeof metadata.merchantReference==='string'?metadata.merchantReference:'',
   amountMinor:amount,currency,status,providerReference:reference,
  };
 }

 normalizeEvent(event:VerifiedPaymentEvent):VerifiedPaymentEvent {return event;}

 signature(raw:Buffer,timestamp:string):string {return createHmac('sha256',this.webhookSecret).update(timestamp+'.').update(raw).digest('hex');}

 async requestRefund():Promise<VerifiedPaymentEvent> {
  fail(503,'INTEGRATION_DISABLED','Snippe does not expose an API refund. Approve the refund, pay it through Operations, then record the settlement reference.');
 }

 private async send(path:string,init:{method:'GET'|'POST';body?:string},idempotencyKey?:string):Promise<Record<string,unknown>> {
  const url=`${this.baseUrl}${path}`;
  for(let attempt=0;attempt<3;attempt++) {
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),this.timeoutMs);
   try {
    const response=await this.fetchImpl(url,{
     method:init.method,
     headers:{Authorization:`Bearer ${this.apiKey}`,Accept:'application/json',...(init.body?{'Content-Type':'application/json'}:{}),...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},
     ...(init.body?{body:init.body}:{}),signal:controller.signal,
    });
    const text=await response.text();
    let payload:{status?:unknown;data?:unknown;message?:unknown}|undefined;
    try { payload=text?JSON.parse(text) as typeof payload:undefined; } catch { payload=undefined; }
    if(response.ok&&payload?.status==='success'&&payload.data&&typeof payload.data==='object') return payload.data as Record<string,unknown>;
    if((response.status===429||response.status>=500)&&attempt<2) { await delay(250*(attempt+1)); continue; }
    this.providerError(response.status,payload?.message);
   } catch(error) {
    if(error instanceof DomainError) throw error;
    if(attempt<2) { await delay(250*(attempt+1)); continue; }
    fail(503,'DEPENDENCY_UNAVAILABLE','The payment provider is temporarily unavailable. Retry shortly.',{ambiguous:true});
   } finally {
    clearTimeout(timer);
   }
  }
  fail(503,'DEPENDENCY_UNAVAILABLE','The payment provider is temporarily unavailable. Retry shortly.',{ambiguous:true});
 }

 private providerError(status:number,message:unknown):never {
  if(status===401||status===403) fail(503,'INTEGRATION_DISABLED','The payment provider rejected our credentials. Contact Operations.');
  if(status===409) fail(409,'PAYMENT_PROVIDER_CONFLICT','The payment provider reported a conflict for this reference.');
  if(status===400||status===404||status===422) {
   const detail=typeof message==='string'&&message.trim()?message.trim().slice(0,200):'The payment provider rejected this request.';
   fail(422,'VALIDATION_FAILED',detail);
  }
  fail(503,'DEPENDENCY_UNAVAILABLE','The payment provider is temporarily unavailable. Retry shortly.',{ambiguous:true});
 }
}

export function normalizeTzPhone(input?:string|null):string {
 const digits=(input??'').replace(/\D/g,'');
 if(/^255[67]\d{8}$/.test(digits)) return digits;
 if(/^0[67]\d{8}$/.test(digits)) return `255${digits.slice(1)}`;
 if(/^[67]\d{8}$/.test(digits)) return `255${digits}`;
 fail(422,'VALIDATION_FAILED','Add a valid Tanzanian mobile number to the customer profile.',{field:'phone'});
}
export function maskPhone(phone:string):string {
 const local=phone.startsWith('255')?phone.slice(3):phone;
 return local.length>=6?`${local.slice(0,3)}•••${local.slice(-3)}`:local;
}
/**
 * Snippe denominates TZS in whole shillings, while our ledger keeps TZS in
 * minor units (100 cents = 1 shilling). USD bookings are converted once at
 * intent creation with an operator-approved rate, and the rate is frozen on
 * the attempt so retries and reconciliation stay deterministic.
 */
export function providerCharge(amountMinor:bigint,currency:string,fxRate?:string):{amountMinor:bigint;currency:'TZS';fxRate?:string} {
 if(currency==='TZS') {
  const divisor=10n**BigInt(SNIPPE_EXPONENT);
  if(amountMinor%divisor!==0n) fail(422,'VALIDATION_FAILED','The amount must be a whole Tanzanian shilling.');
  return {amountMinor:amountMinor/divisor,currency:'TZS'};
 }
 if(currency!=='USD') fail(422,'VALIDATION_FAILED','Snippe collects Tanzanian shillings (TZS) only. Set the booking currency to TZS or USD.');
 const rate=parseFxRate(fxRate);
 const numerator=amountMinor*rate.numerator,denominator=100n*rate.denominator;
 const converted=(numerator+denominator/2n)/denominator;
 return {amountMinor:converted,currency:'TZS',fxRate:rate.canonical};
}
function parseFxRate(value?:string) {
 const raw=(value??'').trim();
 const match=/^(\d{1,6})(?:\.(\d{1,4}))?$/.exec(raw);
 if(!match) fail(422,'PAYMENT_CONFIGURATION','An approved TZS-per-USD rate is required before collecting payment for a USD booking.');
 const fraction=match[2]??'',numerator=BigInt(match[1]+fraction),denominator=10n**BigInt(fraction.length);
 if(numerator<=0n) fail(422,'PAYMENT_CONFIGURATION','The TZS-per-USD rate must be greater than zero.');
 return {numerator,denominator,canonical:fraction?`${match[1]}.${fraction}`:match[1]};
}
function formatProviderAmount(value:bigint):string {return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');}
function formatMinor(value:bigint,exponent:number):string {
 const divisor=10n**BigInt(exponent),whole=value/divisor;
 if(exponent===0)return formatProviderAmount(whole);
 const fraction=(value%divisor).toString().padStart(exponent,'0');
 return `${formatProviderAmount(whole)}.${fraction}`;
}
function minorString(value:unknown):string|null {
 if(typeof value==='number'&&Number.isSafeInteger(value)&&value>0) return String(value);
 if(typeof value==='string'&&/^\d{1,16}$/.test(value)&&value!=='0') return value;
 return null;
}
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
