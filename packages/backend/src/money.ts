import { fail } from './errors.js';
// Supported ISO 4217 currencies; no implicit currency conversion.
export const currencyExponents={USD:2,TZS:2,EUR:2,GBP:2,JPY:0,KWD:3} as const;
export function supportedCurrency(currency:string):keyof typeof currencyExponents {if(!(currency in currencyExponents))fail(422,'VALIDATION_FAILED','Unsupported currency',{field:'currency'});return currency as keyof typeof currencyExponents;}
export function minor(value:string|bigint):bigint {if(typeof value==='bigint')return value;if(!/^\d{1,16}$/.test(value))fail(422,'VALIDATION_FAILED','Amount must be a nonnegative integer minor-unit string');return BigInt(value);}
export function ceilBasisPoints(value:bigint,basisPoints:number) {return(value*BigInt(basisPoints)+9999n)/10000n;}
export function financialSummary(total:bigint,deposit:bigint,adjustments:ReadonlyArray<{amountMinor:bigint,direction:string}>,captures:ReadonlyArray<{amountMinor:bigint}>,refunds:ReadonlyArray<{amountMinor:bigint}>,currency:string) {
 const sum=(rows:ReadonlyArray<{amountMinor:bigint}>)=>rows.reduce((s,r)=>s+r.amountMinor,0n);
 const contractTotal=total+adjustments.reduce((s,r)=>s+(r.direction==='DEBIT'?r.amountMinor:-r.amountMinor),0n);
 const capturedTotal=sum(captures),refundedTotal=sum(refunds),netPaid=capturedTotal-refundedTotal;
 const positive=(n:bigint)=>n>0n?n:0n;
 const balanceDue=positive(contractTotal-netPaid),refundDue=positive(netPaid-contractTotal),depositDue=positive((deposit<contractTotal?deposit:contractTotal)-netPaid);
 return {currency,originalTotal:total,contractTotal,capturedTotal,refundedTotal,netPaid,balanceDue,refundDue,depositTarget:deposit,depositDue,status:refundDue>0n?'REFUND_DUE':balanceDue===0n?'PAID':capturedTotal>0n?'PARTIALLY_PAID':'UNPAID'};
}
export function serialize<T>(value:T):T {return JSON.parse(JSON.stringify(value,(_key,v:unknown)=>typeof v==='bigint'?v.toString():v)) as T;}
export function escapeCsv(value:unknown) {let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
