import { randomBytes,randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { Prisma, type PrismaClient } from '@ma/database';
import { config } from './config.js';
import { fail,requireValue,checkVersion } from './errors.js';
import { hash,transaction,emit,audit,allowed, type Actor,type Tx } from './core.js';
import { permissions,roles,rolePermissions,type Role,type Permission } from './permissions.js';
export const passwordHash=(password:string)=>argon2.hash(password,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1});
export const passwordMatches=async(hashValue:string|null,password:string)=>hashValue?argon2.verify(hashValue,password).catch(()=>false):false;
const opaque=()=>randomBytes(32).toString('base64url');
export class AuthService {
 private jwt=new JwtService({secret:config.JWT_ACCESS_SECRET,signOptions:{expiresIn:config.JWT_ACCESS_TTL_SECONDS,issuer:'ma-safaris',audience:'ma-safaris-app'}});
 constructor(public db:PrismaClient){}
 async user(id:string,tx:Tx|PrismaClient=this.db,context?:Role) {
  const u=requireValue(await tx.user.findUnique({where:{id},include:{roles:{where:{revokedAt:null}},customer:true,staff:true,permissionOverrides:true}}));
  const grants=u.roles.map(r=>r.role).filter((r):r is Role=>roles.includes(r as Role));
  const active=context??grants[0];if(!active||!grants.includes(active))fail(403,'ROLE_CONTEXT_DENIED','That role has not been granted to this account.');
  const roleOverrides=await tx.permissionOverride.findMany({where:{role:active,userId:null}});
  const overrides=[...roleOverrides,...u.permissionOverrides];
  const granted=permissions.filter(p=>{const matching=overrides.filter(o=>o.action===p);if(matching.some(o=>!o.allow))return false;return matching.some(o=>o.allow)||rolePermissions[active].includes(p);});
  return {id:u.id,email:u.email,name:u.customer?.name??u.staff?.displayName??u.email.split('@')[0]!,phone:u.customer?.phone??u.staff?.phone,preferences:u.customer?.preferences??{},locale:u.locale,version:u.version,status:u.status,emailVerified:!!u.emailVerifiedAt,roles:grants,permissions:granted,customerId:u.customer?.id,guideId:u.staff?.id};
 }
 private async tokens(userId:string,sessionId:string,refreshToken:string) {return {accessToken:this.jwt.sign({sub:userId,sid:sessionId}),refreshToken,expiresIn:config.JWT_ACCESS_TTL_SECONDS,user:await this.user(userId)};}
 async authenticate(token:string|undefined,role:string|undefined,requestId:string):Promise<Actor> {
  if(!token?.startsWith('Bearer '))fail(401,'UNAUTHENTICATED','Sign in to continue.');
  let decoded:{sub:string;sid:string};try{decoded=this.jwt.verify(token.slice(7),{issuer:'ma-safaris',audience:'ma-safaris-app'});}catch{fail(401,'TOKEN_EXPIRED','Your session needs to be refreshed.');}
  const session=await this.db.session.findUnique({where:{id:decoded.sid},include:{user:true}});
  if(!session||session.userId!==decoded.sub||session.revokedAt||session.expiresAt<new Date()||session.user.status!=='ACTIVE')fail(401,'SESSION_REVOKED','This session is no longer active.');
  if(role&&!roles.includes(role as Role))fail(403,'ROLE_CONTEXT_DENIED','Unknown role context.');
  const u=await this.user(decoded.sub,this.db,role as Role|undefined);
  return {id:u.id,sessionId:session.id,role:(role??u.roles[0]) as Role,roles:u.roles,permissions:u.permissions as Permission[],customerId:u.customerId,guideId:u.guideId,emailVerified:u.emailVerified,requestId};
 }
 async register(input:{name:string;email:string;password:string;locale:string}) {
  const email=input.email.toLowerCase().trim();const existing=await this.db.user.findUnique({where:{email}});if(existing)fail(409,'REGISTRATION_UNAVAILABLE','Registration could not be completed. Try signing in or resetting your password.');
  const password=await passwordHash(input.password),token=opaque();
  await transaction(this.db,async tx=>{const u=await tx.user.create({data:{email,passwordHash:password,locale:input.locale,roles:{create:{role:'CUSTOMER'}},customer:{create:{name:input.name,email}}}});await tx.authToken.create({data:{userId:u.id,purpose:'VERIFY_EMAIL',tokenHash:hash(token),expiresAt:new Date(Date.now()+86400000)}});await emit(tx,'auth.email',u.id,1,{email:{to:email,subject:'Verify your M&A Safaris email',text:`Open ${config.APP_DEEP_LINK_SCHEME}://verify-email?token=${token}\nVerification code: ${token}`}});});
  return {message:'Account created. Check your email for verification.'};
 }
 async login(input:{email:string;password:string;deviceLabel?:string}) {
  const u=await this.db.user.findUnique({where:{email:input.email.toLowerCase().trim()}});const valid=await passwordMatches(u?.passwordHash??null,input.password);
  if(!u||!valid||u.status!=='ACTIVE')fail(401,'INVALID_CREDENTIALS','Email or password is incorrect.');
  const refresh=opaque();const session=await this.db.session.create({data:{userId:u.id,refreshHash:hash(refresh),familyId:randomUUID(),expiresAt:new Date(Date.now()+config.REFRESH_TTL_DAYS*86400000),deviceLabel:input.deviceLabel}});
  await this.db.user.update({where:{id:u.id},data:{lastLoginAt:new Date()}});return this.tokens(u.id,session.id,refresh);
 }
 async refresh(input:{refreshToken:string}) {
  const refresh=opaque();
  const result=await transaction(this.db,async tx=>{
   const old=await tx.session.findUnique({where:{refreshHash:hash(input.refreshToken)},include:{user:true}});
   if(!old)return null;
   await tx.$queryRaw`SELECT id FROM "Session" WHERE id=${old.id}::uuid FOR UPDATE`;
   const current=requireValue(await tx.session.findUnique({where:{id:old.id}}));
   if(current.rotatedAt||current.revokedAt||current.expiresAt<new Date()||old.user.status!=='ACTIVE') {await tx.session.updateMany({where:{familyId:current.familyId},data:{revokedAt:new Date()}});await tx.deviceToken.updateMany({where:{userId:old.userId},data:{active:false}});return null;}
   await tx.session.update({where:{id:current.id},data:{rotatedAt:new Date(),revokedAt:new Date()}});
   return tx.session.create({data:{userId:current.userId,refreshHash:hash(refresh),familyId:current.familyId,previousId:current.id,expiresAt:current.expiresAt,deviceLabel:current.deviceLabel}});
  });
  if(!result)fail(401,'SESSION_REVOKED','Refresh failed. Sign in again.');return this.tokens(result.userId,result.id,refresh);
 }
 async logout(actor:Actor,all=false) {await transaction(this.db,async tx=>{await tx.session.updateMany({where:all?{userId:actor.id}:{id:actor.sessionId},data:{revokedAt:new Date()}});await tx.deviceToken.updateMany({where:all?{userId:actor.id}:{sessionId:actor.sessionId},data:{active:false}});});return {revoked:true};}
 async requestToken(purpose:'VERIFY_EMAIL'|'RESET_PASSWORD',email:string) {
  const u=await this.db.user.findUnique({where:{email:email.toLowerCase().trim()}});
  if(u?.status==='ACTIVE'){const token=opaque();await transaction(this.db,async tx=>{await tx.authToken.updateMany({where:{userId:u.id,purpose,usedAt:null},data:{usedAt:new Date()}});await tx.authToken.create({data:{userId:u.id,purpose,tokenHash:hash(token),expiresAt:new Date(Date.now()+3600000)}});await emit(tx,'auth.email',u.id,Date.now(),{email:{to:u.email,subject:purpose==='VERIFY_EMAIL'?'Verify your email':'Reset your password',text:`Open ${config.APP_DEEP_LINK_SCHEME}://${purpose==='VERIFY_EMAIL'?'verify-email':'reset-password'}?token=${token}\nCode: ${token}`}});});}
  return {message:'If an eligible account exists, an email has been queued.'};
 }
 async completeToken(purpose:string,input:{token:string;password?:string}) {
  const password=input.password?await passwordHash(input.password):undefined;
  const result=await transaction(this.db,async tx=>{
   const token=await tx.authToken.findUnique({where:{tokenHash:hash(input.token)}});if(!token||token.purpose!==purpose||token.usedAt||token.expiresAt<new Date()||!token.userId)fail(422,'TOKEN_INVALID','The link is invalid or expired. Request a new link.');
   await tx.$queryRaw`SELECT id FROM "AuthToken" WHERE id=${token.id}::uuid FOR UPDATE`;
   const updated=await tx.authToken.updateMany({where:{id:token.id,usedAt:null},data:{usedAt:new Date()}});if(!updated.count)fail(422,'TOKEN_INVALID','This link has already been used.');
   if(purpose==='VERIFY_EMAIL')await tx.user.update({where:{id:token.userId},data:{emailVerifiedAt:new Date(),version:{increment:1}}});
   else if(purpose==='EMAIL_CHANGE'){if(!token.email)fail(422,'TOKEN_INVALID','Missing email change');await tx.user.update({where:{id:token.userId},data:{email:token.email,emailVerifiedAt:new Date(),version:{increment:1}}});await tx.customerProfile.updateMany({where:{userId:token.userId},data:{email:token.email}});}
   else {if(!password)fail(422,'VALIDATION_FAILED','A new password is required.');await tx.user.update({where:{id:token.userId},data:{passwordHash:password,status:'ACTIVE',emailVerifiedAt:purpose==='INVITATION'?new Date():undefined,version:{increment:1}}});}
   if(purpose!=='VERIFY_EMAIL'){await tx.session.updateMany({where:{userId:token.userId},data:{revokedAt:new Date()}});await tx.deviceToken.updateMany({where:{userId:token.userId},data:{active:false}});}
   return {completed:true};
  });return result;
 }
 async changePassword(actor:Actor,input:{currentPassword:string;newPassword:string}) {const u=requireValue(await this.db.user.findUnique({where:{id:actor.id}}));if(!await passwordMatches(u.passwordHash,input.currentPassword))fail(401,'INVALID_CREDENTIALS','Current password is incorrect.');const password=await passwordHash(input.newPassword);await transaction(this.db,async tx=>{await tx.user.update({where:{id:actor.id},data:{passwordHash:password,version:{increment:1}}});await tx.session.updateMany({where:{userId:actor.id},data:{revokedAt:new Date()}});await tx.deviceToken.updateMany({where:{userId:actor.id},data:{active:false}});});return {changed:true,signInRequired:true};}
 async reauthenticate(actor:Actor,input:{password:string;action:string}) {if(input.action!=='identity.email_change'&&!permissions.includes(input.action as Permission))fail(422,'VALIDATION_FAILED','Unknown sensitive action.');const u=requireValue(await this.db.user.findUnique({where:{id:actor.id}}));if(!await passwordMatches(u.passwordHash,input.password))fail(401,'INVALID_CREDENTIALS','Password proof failed.');const token=opaque();await this.db.authToken.create({data:{userId:actor.id,sessionId:actor.sessionId,purpose:'REAUTH',action:input.action,tokenHash:hash(token),expiresAt:new Date(Date.now()+300000)}});return {reauthToken:token,expiresIn:300,action:input.action};}
 async consumeReauth(tx:Tx,actor:Actor,action:Permission,proof:string|undefined) {allowed(actor,action);if(!proof)fail(403,'REAUTHENTICATION_REQUIRED','Confirm your password for this sensitive action.');const token=await tx.authToken.findUnique({where:{tokenHash:hash(proof)}});if(!token||token.purpose!=='REAUTH'||token.action!==action||token.userId!==actor.id||token.sessionId!==actor.sessionId||token.usedAt||token.expiresAt<new Date())fail(403,'REAUTHENTICATION_REQUIRED','Password proof expired or is for another action.');const result=await tx.authToken.updateMany({where:{id:token.id,usedAt:null},data:{usedAt:new Date()}});if(!result.count)fail(403,'REAUTHENTICATION_REQUIRED','Password proof was already used.');}
 async emailChange(actor:Actor,email:string,proof:string|undefined) {const token=opaque();await transaction(this.db,async tx=>{const saved=await tx.authToken.findUnique({where:{tokenHash:hash(proof??'')}});if(!saved||saved.userId!==actor.id||saved.sessionId!==actor.sessionId||saved.purpose!=='REAUTH'||saved.action!=='identity.email_change'||saved.usedAt||saved.expiresAt<new Date())fail(403,'REAUTHENTICATION_REQUIRED','Confirm your password first.');await tx.authToken.update({where:{id:saved.id},data:{usedAt:new Date()}});await tx.authToken.create({data:{userId:actor.id,email:email.toLowerCase().trim(),purpose:'EMAIL_CHANGE',tokenHash:hash(token),expiresAt:new Date(Date.now()+3600000)}});await emit(tx,'auth.email',actor.id,Date.now(),{email:{to:email,subject:'Confirm your new email',text:`Open ${config.APP_DEEP_LINK_SCHEME}://email-change?token=${token}\nCode: ${token}`}});});return {queued:true};}
 async profile(actor:Actor,input:{expectedVersion:number;name?:string;phone?:string;country?:string;locale?:string;preferences?:Prisma.InputJsonValue}) {await transaction(this.db,async tx=>{const u=requireValue(await tx.user.findUnique({where:{id:actor.id}}));checkVersion(u.version,input.expectedVersion);await tx.user.update({where:{id:actor.id},data:{locale:input.locale,version:{increment:1}}});if(actor.customerId)await tx.customerProfile.update({where:{id:actor.customerId},data:{name:input.name,phone:input.phone,country:input.country,preferences:input.preferences,version:{increment:1}}});if(actor.guideId)await tx.staffProfile.update({where:{id:actor.guideId},data:{displayName:input.name,phone:input.phone,version:{increment:1}}});await audit(tx,actor,'profile.updated','User',actor.id,{changedFields:Object.keys(input).filter(k=>k!=='expectedVersion')});});return this.user(actor.id,this.db,actor.role);}
 async invite(tx:Tx,userId:string,email:string) {const token=opaque();await tx.authToken.updateMany({where:{userId,purpose:'INVITATION',usedAt:null},data:{usedAt:new Date()}});await tx.authToken.create({data:{userId,email,purpose:'INVITATION',tokenHash:hash(token),expiresAt:new Date(Date.now()+7*86400000)}});await emit(tx,'auth.email',userId,Date.now(),{email:{to:email,subject:'Your M&A Safaris invitation',text:`Set your own password: ${config.APP_DEEP_LINK_SCHEME}://accept-invitation?token=${token}\nCode: ${token}`}});}
}
