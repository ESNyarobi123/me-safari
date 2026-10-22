export type Role='CUSTOMER'|'OPERATIONS'|'DRIVER_GUIDE'|'ADMIN';
export interface User {id:string;email:string;name:string;locale:'en'|'sw';status:string;version:number;emailVerified:boolean;roles:Role[];permissions:string[];customerId?:string;guideId?:string;}
export interface AuthResponse {accessToken:string;refreshToken:string;expiresIn:number;user:User;}
export interface Money {currency:string;minor:string;}
export interface PaymentSummary {currency:string;originalTotal:string;contractTotal:string;capturedTotal:string;refundedTotal:string;netPaid:string;balanceDue:string;refundDue:string;depositTarget:string;depositDue:string;status:string;}
export class ApiError extends Error {constructor(public status:number,public code:string,message:string,public details:Record<string,unknown>={},public requestId?:string){super(message);this.name='ApiError';}}
export type RequestOptions={idempotencyKey?:string;reauthToken?:string;signal?:AbortSignal;headers?:Record<string,string>};
export function createClient(config:{baseUrl:string;getAccessToken?:()=>string|null|Promise<string|null>;getRole?:()=>Role|null;onUnauthorized?:()=>Promise<boolean|void>}) {
 const base=config.baseUrl.replace(/\/$/,'');
 const request=async<T>(path:string,method='GET',body?:unknown,options:RequestOptions={}):Promise<T>=>{
   const invoke=async()=>{const token=await config.getAccessToken?.();const role=config.getRole?.();return fetch(base+path,{method,headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:`Bearer ${token}`} :{}),...(role?{'X-Role-Context':role}:{}),...(options.idempotencyKey?{'Idempotency-Key':options.idempotencyKey}:{}),...(options.reauthToken?{'X-Reauthentication-Token':options.reauthToken}:{}),...options.headers},body:body===undefined?undefined:JSON.stringify(body),signal:options.signal});};
   let response=await invoke();if(response.status===401&&config.onUnauthorized&&await config.onUnauthorized())response=await invoke();
   const json=await response.json() as {data:T;error?:{code:string;message:string;details?:Record<string,unknown>;requestId?:string}};
   if(!response.ok)throw new ApiError(response.status,json.error?.code??'REQUEST_FAILED',json.error?.message??'Request failed',json.error?.details,json.error?.requestId);
   return json.data;
 };
 return {request,baseUrl:base};
}
export type ApiClient=ReturnType<typeof createClient>;
