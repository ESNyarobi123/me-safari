export class DomainError extends Error {
  constructor(public status:number,public code:string,message:string,public details:Record<string,unknown>={}) {super(message);this.name='DomainError';}
}
export function fail(status:number,code:string,message:string,details:Record<string,unknown>={}):never {throw new DomainError(status,code,message,details);}
export function requireValue<T>(value:T|null|undefined,message='Record unavailable'):T {if(value===null||value===undefined)fail(404,'NOT_FOUND',message);return value;}
export function checkVersion(actual:number,expected:unknown) {if(actual!==expected)fail(409,'VERSION_CONFLICT','This record changed. Refresh and review before saving.',{currentVersion:actual});}
