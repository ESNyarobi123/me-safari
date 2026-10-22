import { createCipheriv,createDecipheriv,createHash,randomBytes } from 'node:crypto';
import { config } from './config.js';
export interface EmailPayload {to:string;subject:string;text:string;}
const key=createHash('sha256').update(config.JWT_ACCESS_SECRET+'outbox-email-v1').digest();
export function sealEmail(value:EmailPayload) {const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,iv);const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return {sealed:encrypted.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64')};}
export function openEmail(value:{sealed:string;iv:string;tag:string}):EmailPayload {const cipher=createDecipheriv('aes-256-gcm',key,Buffer.from(value.iv,'base64'));cipher.setAuthTag(Buffer.from(value.tag,'base64'));return JSON.parse(Buffer.concat([cipher.update(Buffer.from(value.sealed,'base64')),cipher.final()]).toString('utf8')) as EmailPayload;}
