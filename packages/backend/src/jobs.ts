import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Queue, Worker } from 'bullmq';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import { createDatabase, Prisma, type PrismaClient } from '@ma/database';
import { config, privateStoragePath } from './config.js';
import { currencyExponents, escapeCsv, financialSummary } from './money.js';
import { openEmail, sealEmail } from './sealed-email.js';
import { reconcilePendingPayments } from './finance.js';

type Event = Awaited<ReturnType<PrismaClient['outboxEvent']['findUniqueOrThrow']>>;
type Payload = { customerId?: string; userId?: string; guideUserId?: string; bookingId?: string; paymentPostingId?: string; postingId?: string; quoteId?: string; itineraryId?: string; documentId?: string; exportJobId?: string; title?: string; body?: string; email?: { sealed: string; iv: string; tag: string } };
const json = (value: unknown) => value as Prisma.InputJsonValue;
const titles: Record<string,string> = {
  'booking.requested':'Safari request received', 'booking.confirmed':'Your safari is confirmed',
  'booking.declined':'Booking review completed', 'booking.change_decided':'Booking change reviewed',
  'payment.captured':'Development payment received', 'quote.sent':'Your quotation is ready',
  'quote.accepted':'Quotation accepted', 'itinerary.published':'Your itinerary is ready',
  'trip.assignment_changed':'Trip assignment updated', 'trip.progressed':'Trip progress updated',
  'trip.issue_reported':'Trip issue reported', 'trip.completed':'Your trip is complete',
  'booking.completed':'Your safari is complete', 'request.submitted':'Custom request received',
  'request.revision':'Quotation revision requested', 'refund.settled':'Refund settled',
};
const safeError = (error: unknown) => error instanceof Error ? error.name + ': processing failed; see redacted worker log' : 'Processing failed';
const money = (amount: bigint, currency: string) => {
  const exponent = currencyExponents[currency as keyof typeof currencyExponents] ?? 2;
  const scale = 10n ** BigInt(exponent);
  const negative = amount < 0n; const absolute = negative ? -amount : amount;
  return `${currency} ${negative?'-':''}${absolute/scale}${exponent?'.'+(absolute%scale).toString().padStart(exponent,'0'):''}`;
};

async function pdf(title: string, lines: string[]): Promise<Buffer> {
  const document = new PDFDocument({ size: 'A4', margin: 48, info: { Title: title, Author: 'Me and Adventure Safaris' } });
  const chunks: Buffer[] = [];
  const ready = new Promise<Buffer>((resolve,reject) => { document.on('data',chunk=>chunks.push(chunk as Buffer)); document.on('end',()=>resolve(Buffer.concat(chunks))); document.on('error',reject); });
  document.font('Helvetica-Bold').fontSize(20).fillColor('#EE6A18').text('M&A SAFARIS');
  document.fontSize(10).fillColor('#343434').text('Me and Adventure Safaris | Your Gateway to Authentic Tanzania');
  document.moveDown(1.2).fontSize(17).fillColor('#111111').text(title).moveDown(.8);
  document.font('Helvetica').fontSize(10).fillColor('#303030');
  for (const line of lines) { if (document.y > 735) document.addPage(); document.text(line,{width:499,lineGap:4}).moveDown(.3); }
  document.moveDown().fontSize(8).fillColor('#646464').text('Private document generated from the authorized source version. Development rates and payment provider are examples.');
  document.end();
  return ready;
}

async function saveArtifact(key: string, buffer: Buffer) {
  await mkdir(privateStoragePath,{ recursive:true, mode:0o700 });
  const temporary=join(privateStoragePath,`.${randomUUID()}.tmp`);
  await writeFile(temporary,buffer,{mode:0o600});
  await rename(temporary,join(privateStoragePath,key));
  return { checksum:createHash('sha256').update(buffer).digest('hex'), bytes:BigInt(buffer.length) };
}

export class JobProcessor {
  constructor(public readonly db: PrismaClient = createDatabase()) {}

  private async sourceDocument(type: 'RECEIPT'|'QUOTE'|'ITINERARY', sourceId: string) {
    const logicalKey=`${type.toLowerCase()}:${sourceId}`;
    const existing=await this.db.document.findUnique({where:{logicalKey}});
    if(existing?.status==='READY')return existing;
    let title='',lines:string[]=[],relations:Prisma.DocumentUncheckedCreateInput;
    if(type==='RECEIPT') {
      const p=await this.db.paymentPosting.findUniqueOrThrow({where:{id:sourceId},include:{intent:true,booking:{include:{customer:true}}}});
      title=`Payment receipt ${p.booking.reference}`;
      lines=[`Booking: ${p.booking.reference}`,`Customer: ${p.booking.customer.name}`,`Payment purpose: ${p.intent?.purpose??'Verified offline payment'}`,`Amount captured: ${money(p.amountMinor,p.currency)}`,`Settlement: ${p.settledAt.toISOString()}`,`Provider: ${p.provider}`,`Capture reference: ${p.providerReference}`,'A receipt confirms a settled capture. Operations confirmation and any outstanding balance remain separate.'];
      relations={type,sourceVersion:sourceId,logicalKey,customerId:p.booking.customerId,bookingId:p.bookingId,postingId:p.id};
    } else if(type==='QUOTE') {
      const q=await this.db.quoteVersion.findUniqueOrThrow({where:{id:sourceId},include:{lines:true,request:{include:{customer:true}}}});
      if(!q.sentAt)throw new Error('Quotation is not sent');
      title=`Quotation version ${q.versionNumber}`;
      lines=[`Customer: ${q.request.customer.name}`,`Quotation: ${q.id}`,`Expires: ${q.expiresAt.toISOString()}`,`Total: ${money(q.totalMinor,q.currency)}`,`Required deposit: ${money(q.depositMinor,q.currency)}`, ...q.lines.filter(line=>line.customerVisible).map(line=>`${line.description} | ${line.quantity} x ${money(line.unitMinor,q.currency)} = ${money(line.totalMinor,q.currency)}`)];
      lines.push(...this.itineraryLines(q.itinerary));
      lines.push(...this.policyLines(q.policySnapshot));
      relations={type,sourceVersion:String(q.versionNumber),logicalKey,customerId:q.request.customerId,quoteId:q.id};
    } else {
      const itinerary=await this.db.itineraryVersion.findUniqueOrThrow({where:{id:sourceId},include:{booking:{include:{customer:true,pickup:true,package:true}},days:{orderBy:{sequence:'asc'},include:{activities:{orderBy:{order:'asc'}}}}}});
      if(!itinerary.publishedAt||!itinerary.booking)throw new Error('Itinerary is not a published booking version');
      title=`Itinerary ${itinerary.booking.reference}`;
      lines=[`Customer: ${itinerary.booking.customer.name}`,`Published version: ${itinerary.versionNumber}`,`Travel: ${itinerary.booking.startDate.toISOString().slice(0,10)} to ${itinerary.booking.endDate.toISOString().slice(0,10)}`,`Timezone: ${itinerary.timezone}`];
      for(const day of itinerary.days.filter(day=>day.visibility==='CUSTOMER')) {
        lines.push(`Day ${day.sequence}: ${day.title}`, ...(day.accommodation?[`Accommodation: ${day.accommodation}`]:[]), ...day.activities.filter(activity=>activity.visibility==='CUSTOMER').map(activity=>`${activity.title}${activity.customerText?' - '+activity.customerText:''}`));
      }
      if(!itinerary.days.length)lines.push(...this.itineraryLines(itinerary.content));
      const pickup=itinerary.booking.pickup;
      if(pickup?.approved)lines.push(`Pickup: ${pickup.label}`,pickup.address,`Pickup time: ${pickup.pickupAt?.toISOString()??'Operations will finalize'} (${pickup.timezone})`);
      if(itinerary.booking.package){lines.push('Included:',...((itinerary.booking.package.inclusions as string[])??[]),'Excluded:',...((itinerary.booking.package.exclusions as string[])??[]));}
      lines.push(...this.policyLines(itinerary.booking.policySnapshot));
      relations={type,sourceVersion:String(itinerary.versionNumber),logicalKey,customerId:itinerary.booking.customerId,bookingId:itinerary.bookingId,itineraryVersionId:itinerary.id};
    }
    const settings=(await this.db.companySettingsVersion.findFirst({orderBy:{version:'desc'}}))?.settings as {email?:string;phone?:string}|undefined;
    lines.push(`Support: ${settings?.email??'meandadventuretz@gmail.com'} | ${settings?.phone??'+255 682 886 259'}`);
    const document=await this.db.document.upsert({where:{logicalKey},create:relations,update:{status:'PROCESSING',error:null}});
    try {
      const buffer=await pdf(title,lines);
      const storageKey=document.storageKey??`${document.id}.pdf`;
      const facts=await saveArtifact(storageKey,buffer);
      return await this.db.document.update({where:{id:document.id},data:{status:'READY',storageKey,mime:'application/pdf',...facts,error:null}});
    }catch(error){await this.db.document.update({where:{id:document.id},data:{status:'FAILED',error:safeError(error)}});throw error;}
  }

  private itineraryLines(value: unknown): string[] {
    const content=value as { days?: Array<{sequence?:number;title?:string;accommodation?:string;activities?:Array<{title?:string;customerText?:string;visibility?:string}>}> };
    return (content?.days??[]).flatMap((day,index)=>[`Day ${day.sequence??index+1}: ${day.title??''}`,...(day.accommodation?[`Accommodation: ${day.accommodation}`]:[]),...(day.activities??[]).filter(activity=>activity.visibility!=='INTERNAL'&&activity.visibility!=='GUIDE').map(activity=>`${activity.title??''}${activity.customerText?' - '+activity.customerText:''}`)]);
  }

  private policyLines(value: unknown): string[] {
    const p=value as {cancellationText?:string;depositBasisPoints?:number;balanceDaysBefore?:number;rules?:{cancellationText?:string}};
    return ['Booking policy:',...(p.depositBasisPoints!==undefined?[`Required deposit: ${p.depositBasisPoints/100}% of the accepted total`]:[]),...(p.balanceDaysBefore!==undefined?[`Balance deadline: ${p.balanceDaysBefore} calendar days before departure; short-notice requests require full payment.`]:[]),p.cancellationText??p.rules?.cancellationText??'Cancellation and rescheduling require staff review.'];
  }

  private async exportReport(jobId: string) {
    const job=await this.db.exportJob.findUniqueOrThrow({where:{id:jobId}});
    if(job.status==='READY')return;
    const filters=job.filters as {currency?:string;startDate?:string;endDate?:string;format?:string};
    const bookings=await this.db.booking.findMany({
      where:{...(filters.currency?{currency:filters.currency}:{}),...(filters.startDate||filters.endDate?{createdAt:{...(filters.startDate?{gte:new Date(filters.startDate)}:{}),...(filters.endDate?{lte:new Date(filters.endDate)}:{})}}:{})},
      orderBy:[{createdAt:'asc'},{id:'asc'}],take:10_000,
      include:{customer:true,adjustments:true,postings:true,refunds:{include:{postings:true}}},
    });
    const columns=['booking_id','reference','customer','start_date','status','currency','original_total_minor','contract_total_minor','captured_minor','refunded_minor','balance_due_minor','refund_due_minor'];
    const rows=bookings.map(b=>{const totals=financialSummary(b.totalMinor,b.depositMinor,b.adjustments,b.postings,b.refunds.flatMap(r=>r.postings),b.currency);return [b.id,b.reference,b.customer.name,b.startDate.toISOString().slice(0,10),b.status,b.currency,totals.originalTotal,totals.contractTotal,totals.capturedTotal,totals.refundedTotal,totals.balanceDue,totals.refundDue];});
    const format=filters.format?.toUpperCase()==='PDF'?'pdf':'csv';
    const buffer=format==='pdf'?await pdf('Financial report',rows.flatMap(row=>[`${row[1]} | ${row[2]} | ${row[4]} | ${row[5]}`,`Original ${row[6]} minor | Contract ${row[7]} | Captured ${row[8]} | Refunded ${row[9]} | Due ${row[10]}`])):Buffer.from([columns.map(escapeCsv).join(','),...rows.map(row=>row.map(escapeCsv).join(','))].join('\r\n'),'utf8');
    const logicalKey=`export:${job.id}`;
    const document=await this.db.document.upsert({where:{logicalKey},create:{type:'EXPORT',sourceVersion:job.id,logicalKey,ownerUserId:job.actorId,mime:format==='pdf'?'application/pdf':'text/csv'},update:{status:'PROCESSING',error:null}});
    const storageKey=`${document.id}.${format}`;
    const facts=await saveArtifact(storageKey,buffer);
    await this.db.$transaction([
      this.db.document.update({where:{id:document.id},data:{status:'READY',storageKey,...facts,error:null}}),
      this.db.exportJob.update({where:{id:job.id},data:{status:'READY',documentId:document.id,error:null}}),
    ]);
  }

  private async email(event: Event, payload: Payload) {
    if(!payload.email)return;
    const email=openEmail(payload.email);
    const logicalKey=`email:${event.id}:${createHash('sha256').update(email.to).digest('hex').slice(0,16)}`;
    const delivery=await this.db.deliveryAttempt.upsert({where:{logicalKey},create:{eventId:event.id,channel:'EMAIL',logicalKey},update:{}});
    if(delivery.state==='ACCEPTED'||delivery.state==='DELIVERED')return;
    if(delivery.state==='SENDING'||delivery.state==='UNKNOWN')throw new Error('Email delivery is ambiguous; operator review required');
    await this.db.deliveryAttempt.update({where:{id:delivery.id},data:{state:'SENDING',attempts:{increment:1},error:null}});
    const transport=nodemailer.createTransport({host:config.SMTP_HOST,port:config.SMTP_PORT,secure:config.SMTP_SECURE==='true',requireTLS:config.NODE_ENV==='production'&&config.SMTP_SECURE!=='true',tls:{minVersion:'TLSv1.2'},connectionTimeout:5000,greetingTimeout:5000,socketTimeout:10000});
    try {
      const result=await transport.sendMail({from:config.SMTP_FROM,...email,messageId:`<${event.id}@ma-safaris.local>`});
      await this.db.deliveryAttempt.update({where:{id:delivery.id},data:{state:'ACCEPTED',providerMessageId:result.messageId,error:null}});
    }catch(error){await this.db.deliveryAttempt.update({where:{id:delivery.id},data:{state:'FAILED',error:safeError(error)}});throw error;}
    finally {transport.close();}
  }

  async process(eventId: string) {
    // A database lock covers generation and delivery even if a Redis lock expires
    // or a second worker enqueues the same durable event during recovery.
    await this.db.$transaction(async tx=>{
      const locks=await tx.$queryRaw<Array<{locked:boolean}>>`SELECT pg_try_advisory_xact_lock(hashtextextended(${`outbox:${eventId}`},0)) AS locked`;
      if(!locks[0]?.locked)return;
      await this.processClaimed(eventId);
    },{maxWait:5000,timeout:60000});
  }

  private async processClaimed(eventId: string) {
    const event=await this.db.outboxEvent.findUniqueOrThrow({where:{id:eventId}});
    if(event.processedAt)return;
    const payload=event.payload as Payload;
    await this.db.outboxEvent.update({where:{id:event.id},data:{state:'PROCESSING',lockedAt:new Date(),attempts:{increment:1},error:null}});
    try {
      if(event.type==='payment.captured') {
        const postingId=payload.paymentPostingId??payload.postingId;
        if(postingId)await this.sourceDocument('RECEIPT',postingId);
      }
      if(event.type==='quote.sent'&&payload.quoteId)await this.sourceDocument('QUOTE',payload.quoteId);
      if(event.type==='itinerary.published'&&payload.itineraryId)await this.sourceDocument('ITINERARY',payload.itineraryId);
      if((event.type==='report.export'||event.type==='export.requested')&&payload.exportJobId)await this.exportReport(payload.exportJobId);
      await this.email(event,payload);
      const recipients=new Set<string>();
      if(payload.userId)recipients.add(payload.userId);
      if(payload.guideUserId)recipients.add(payload.guideUserId);
      let customerId=payload.customerId;
      if(!customerId&&payload.bookingId)customerId=(await this.db.booking.findUnique({where:{id:payload.bookingId},select:{customerId:true}}))?.customerId;
      if(!customerId&&payload.quoteId)customerId=(await this.db.quoteVersion.findUnique({where:{id:payload.quoteId},include:{request:{select:{customerId:true}}}}))?.request.customerId;
      if(customerId){const owner=await this.db.customerProfile.findUnique({where:{id:customerId},select:{userId:true}});if(owner?.userId)recipients.add(owner.userId);}
      if(['booking.requested','request.submitted','request.revision','trip.issue_reported'].includes(event.type)) {
        const staff=await this.db.user.findMany({where:{status:'ACTIVE',roles:{some:{role:{in:['OPERATIONS','ADMIN']},revokedAt:null}}},select:{id:true}});
        staff.forEach(user=>recipients.add(user.id));
      }
      const title=payload.title??titles[event.type];
      const portalLink=payload.quoteId&&['quote.sent','request.revision'].includes(event.type)
        ?`${config.PUBLIC_WEB_URL}/portal/quotes/?id=${encodeURIComponent(payload.quoteId)}`
        :payload.bookingId?`${config.PUBLIC_WEB_URL}/portal/bookings/?id=${encodeURIComponent(payload.bookingId)}`:null;
      const body=payload.body??(portalLink?`Open your secure travel file to view the latest authorized details: ${portalLink}`:'Open the app to view the latest authorized details.');
      if(title)for(const userId of recipients)await this.db.notification.upsert({where:{logicalKey:`${event.id}:${userId}`},create:{userId,type:event.type,resourceId:payload.bookingId??payload.quoteId??event.aggregateId,title,body,logicalKey:`${event.id}:${userId}`},update:{}});
      if(title&&customerId&&!payload.email){
        const owner=await this.db.customerProfile.findUnique({where:{id:customerId},include:{user:{select:{email:true,status:true}}}});
        if(owner?.user?.status==='ACTIVE')await this.email(event,{email:sealEmail({to:owner.user.email,subject:title,text:`Hello ${owner.name},\n\n${title}. ${body}\n\nMe and Adventure Safaris\nDevelopment notification: rates and payment adapter are local examples.`})});
      }
      await this.db.outboxEvent.update({where:{id:event.id},data:{state:'DONE',processedAt:new Date(),lockedAt:null,error:null}});
    }catch(error) {
      await this.db.outboxEvent.update({where:{id:event.id},data:{state:'FAILED',lockedAt:null,error:safeError(error),nextAttemptAt:new Date(Date.now()+30_000)}});
      if(payload.exportJobId)await this.db.exportJob.update({where:{id:payload.exportJobId},data:{status:'FAILED',error:safeError(error)}}).catch(()=>undefined);
      throw error;
    }
  }

  async expireHolds() {
    await reconcilePendingPayments(this.db);
    const now=new Date();
    await this.db.$transaction(async tx=>{
      await tx.departureReservation.updateMany({where:{state:'HELD',expiresAt:{lte:now},booking:{postings:{none:{}}}},data:{state:'RELEASED'}});
      // A PENDING intent is expirable only after the adapter query above and only
      // when no capture exists. UNKNOWN/PROCESSING remain reserved for reconciliation.
      await tx.paymentIntent.updateMany({where:{provider:{in:['mock',...(config.PAYMENT_PROVIDER==='snippe'?['snippe']:[])]},state:'PENDING',expiresAt:{lte:now},postings:{none:{}}},data:{state:'EXPIRED',reservationMinor:0n,version:{increment:1}}});
      await tx.quoteVersion.updateMany({where:{state:'SENT',expiresAt:{lte:now}},data:{state:'EXPIRED',version:{increment:1}}});
      await tx.authToken.deleteMany({where:{expiresAt:{lt:new Date(now.getTime()-7*86_400_000)}}});
      await tx.idempotencyRecord.deleteMany({where:{expiresAt:{lt:now}}});
    });
  }
}

export function redisConnectionOptions(connectionString:string) {
  const redis=new URL(connectionString);
  return {host:redis.hostname.replace(/^\[|\]$/g,''),port:Number(redis.port||6379),username:redis.username?decodeURIComponent(redis.username):undefined,password:redis.password?decodeURIComponent(redis.password):undefined,db:Number(redis.pathname.slice(1)||0),connectTimeout:5000,maxRetriesPerRequest:null,...(redis.protocol==='rediss:'?{tls:{}}:{})};
}

export async function startWorker(db: PrismaClient=createDatabase()) {
  const connection=redisConnectionOptions(config.REDIS_URL);
  const queue=new Queue('ma-outbox',{connection,defaultJobOptions:{attempts:5,backoff:{type:'exponential',delay:2000},removeOnComplete:true,removeOnFail:1000}});
  const processor=new JobProcessor(db);
  const worker=new Worker('ma-outbox',async job=>processor.process((job.data as {eventId:string}).eventId),{connection,concurrency:3});
  worker.on('error',error=>console.error(JSON.stringify({level:'error',component:'worker',error:safeError(error)})));
  let busy=false;
  async function dispatchOnce() {
    if(busy)return;busy=true;
    try {
      const events=await db.outboxEvent.findMany({where:{processedAt:null,nextAttemptAt:{lte:new Date()},OR:[{state:'PENDING'},{state:'FAILED',attempts:{lt:5}},{state:'DISPATCHED',lockedAt:{lt:new Date(Date.now()-60_000)}},{state:'PROCESSING',lockedAt:{lt:new Date(Date.now()-120_000)}}]},orderBy:{createdAt:'asc'},take:50});
      for(const event of events) {
        const jobId=event.id;
        const existing=await queue.getJob(jobId);
        if(existing) {const state=await existing.getState();if(state==='failed'||state==='completed')await existing.remove();else continue;}
        await queue.add(event.type,{eventId:event.id},{jobId});
        await db.outboxEvent.updateMany({where:{id:event.id,processedAt:null,state:{not:'PROCESSING'}},data:{state:'DISPATCHED',lockedAt:new Date()}});
      }
    }finally{busy=false;}
  }
  let ticks=0;
  const timer=setInterval(()=>{void dispatchOnce().catch(error=>console.error(JSON.stringify({level:'error',component:'outbox',error:safeError(error)})));if(++ticks%15===0)void processor.expireHolds().catch(error=>console.error(JSON.stringify({level:'error',component:'expiry',error:safeError(error)})));},2000);
  await dispatchOnce();
  return {queue,worker,processor,dispatchOnce,async close(){clearInterval(timer);await worker.close();await queue.close();await db.$disconnect();}};
}
