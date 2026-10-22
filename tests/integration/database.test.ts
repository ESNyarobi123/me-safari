import { randomUUID } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { createDatabase, Prisma } from '@ma/database';

loadEnv({quiet:true});
const url=process.env.TEST_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith('/ma_safaris_test'))throw new Error('Database invariant tests require the isolated ma_safaris_test TEST_DATABASE_URL');
const db=createDatabase(url);
type Tx=Prisma.TransactionClient;
const rollback=new Error('successful-assertion-rollback');

async function fixture(tx: Tx) {
  const suffix=randomUUID();
  const user=await tx.user.create({data:{email:`${suffix}@db-integration.test`,emailVerifiedAt:new Date(),roles:{create:{role:'CUSTOMER'}},customer:{create:{name:'Invariant Test Customer'}}},include:{customer:true}});
  const guideUser=await tx.user.create({data:{email:`guide-${suffix}@db-integration.test`,roles:{create:{role:'DRIVER_GUIDE'}},staff:{create:{displayName:'Invariant Guide',capabilities:['wildlife']}}},include:{staff:true}});
  const policy=await tx.bookingPolicyVersion.create({data:{version:Math.floor(Math.random()*1_000_000_000)+100,rules:{developmentExample:true}}});
  const service=await tx.serviceCategory.create({data:{slug:suffix,title:'Invariant service',description:'Test fixture'}});
  const pkg=await tx.package.create({data:{slug:suffix,title:'Invariant package',description:'Test fixture',categoryId:service.id,durationDays:2,status:'PUBLISHED'}});
  const start=new Date('2030-01-01T00:00:00Z'),end=new Date('2030-01-02T00:00:00Z');
  const booking=await tx.booking.create({data:{customerId:user.customer!.id,reference:suffix,source:'PACKAGE',packageId:pkg.id,policyVersionId:policy.id,startDate:start,endDate:end,adults:2,currency:'USD',totalMinor:10000n,depositMinor:3000n,priceSnapshot:{totalMinor:'10000'},policySnapshot:{depositBasisPoints:3000},travelers:{create:[{fullName:'Lead traveler',band:'ADULT',lead:true},{fullName:'Second traveler',band:'ADULT'}]}}});
  const itinerary=await tx.itineraryVersion.create({data:{bookingId:booking.id,versionNumber:1,state:'PUBLISHED',content:{days:[]},publishedAt:new Date()}});
  const trip=await tx.trip.create({data:{bookingId:booking.id,reference:'trip-'+suffix,startsAt:start,endsAt:new Date(end.getTime()+86400000),itineraryVersionId:itinerary.id}});
  const vehicle=await tx.vehicle.create({data:{registration:suffix,type:'Safari vehicle',seats:7}});
  const intent=await tx.paymentIntent.create({data:{bookingId:booking.id,customerId:user.customer!.id,purpose:'FULL',amountMinor:10000n,reservationMinor:0n,currency:'USD',provider:'mock',merchantReference:suffix,state:'SUCCEEDED',expiresAt:new Date(Date.now()+3600000)}});
  const capture=await tx.paymentPosting.create({data:{bookingId:booking.id,intentId:intent.id,amountMinor:10000n,currency:'USD',provider:'mock',providerReference:suffix,settledAt:new Date()}});
  return {user,guide:guideUser.staff!,policy,pkg,booking,itinerary,trip,vehicle,intent,capture,start,end};
}

async function violates(fn: (tx:Tx,f:Awaited<ReturnType<typeof fixture>>)=>Promise<unknown>, pattern:RegExp) {
  await expect(db.$transaction(async tx=>{const f=await fixture(tx);await fn(tx,f);throw new Error('Constraint did not reject the mutation');})).rejects.toThrow(pattern);
}
async function succeeds(fn:(tx:Tx,f:Awaited<ReturnType<typeof fixture>>)=>Promise<void>) {
  await expect(db.$transaction(async tx=>{await fn(tx,await fixture(tx));throw rollback;})).rejects.toThrow(rollback.message);
}
afterAll(async()=>{await db.$disconnect();});

describe('PostgreSQL17 authoritative invariants',()=>{
  test('successful captures cannot be edited',async()=>violates((tx,f)=>tx.paymentPosting.update({where:{id:f.capture.id},data:{amountMinor:1n}}),/append-only/));
  test('successful captures cannot be deleted',async()=>violates((tx,f)=>tx.paymentPosting.delete({where:{id:f.capture.id}}),/append-only/));
  test('audit history cannot be edited',async()=>violates(async(tx,f)=>{const event=await tx.auditEvent.create({data:{actorId:f.user.id,action:'test',entityType:'Booking',entityId:f.booking.id,requestId:'invariant-test',summary:{}}});return tx.auditEvent.update({where:{id:event.id},data:{summary:{tampered:true}}});},/append-only/));
  test('accepted booking snapshots cannot be repriced',async()=>violates((tx,f)=>tx.booking.update({where:{id:f.booking.id},data:{totalMinor:20000n}}),/immutable/));
  test('capture reference is unique across deliveries',async()=>violates((tx,f)=>tx.paymentPosting.create({data:{bookingId:f.booking.id,intentId:f.intent.id,amountMinor:10000n,currency:'USD',provider:'mock',providerReference:f.capture.providerReference,settledAt:new Date()}}),/Unique constraint/));
  test('currency mismatch cannot credit a booking',async()=>violates((tx,f)=>tx.paymentPosting.create({data:{bookingId:f.booking.id,intentId:f.intent.id,amountMinor:10000n,currency:'EUR',provider:'mock',providerReference:randomUUID(),settledAt:new Date()}}),/currency mismatch/));
  test('unverified offline evidence cannot create credit',async()=>violates(async(tx,f)=>{const row=await tx.offlinePaymentRecord.create({data:{bookingId:f.booking.id,reference:randomUUID(),method:'BANK',evidence:{file:'evidence'},amountMinor:100n,currency:'USD',submittedBy:f.user.id}});return tx.paymentPosting.create({data:{bookingId:f.booking.id,offlineRecordId:row.id,amountMinor:100n,currency:'USD',provider:'offline',providerReference:row.reference,settledAt:new Date()}});},/unverified/));
  test('overlapping active vehicle allocations are excluded',async()=>violates(async(tx,f)=>{const allocation={tripId:f.trip.id,resourceType:'VEHICLE',resourceId:f.vehicle.id,startsAt:f.trip.startsAt,endsAt:f.trip.endsAt};await tx.resourceAllocation.create({data:allocation});return tx.resourceAllocation.create({data:allocation});},/allocation_no_overlap|exclusion/));
  test('two concurrent allocations admit exactly one winner',async()=>{
    const vehicle=await db.vehicle.create({data:{registration:randomUUID(),type:'Concurrent maintenance fixture',seats:7}});
    try{
      const data={resourceType:'VEHICLE',resourceId:vehicle.id,source:'MAINTENANCE',startsAt:new Date('2031-01-01T00:00:00Z'),endsAt:new Date('2031-01-02T00:00:00Z')};
      const results=await Promise.allSettled([db.$transaction(tx=>tx.resourceAllocation.create({data})),db.$transaction(tx=>tx.resourceAllocation.create({data}))]);
      expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
      expect(results.filter(result=>result.status==='rejected')).toHaveLength(1);
      expect(String((results.find(result=>result.status==='rejected') as PromiseRejectedResult).reason)).toMatch(/allocation_no_overlap|exclusion/);
    }finally{await db.resourceAllocation.deleteMany({where:{vehicleId:vehicle.id}});await db.vehicle.delete({where:{id:vehicle.id}});}
  });
  test('half-open adjacent intervals and released intervals are reusable',async()=>succeeds(async(tx,f)=>{const data={tripId:f.trip.id,resourceType:'VEHICLE',resourceId:f.vehicle.id,startsAt:f.trip.startsAt,endsAt:f.trip.endsAt};await tx.resourceAllocation.create({data:{...data,state:'RELEASED'}});await tx.resourceAllocation.create({data});await tx.resourceAllocation.create({data:{...data,startsAt:f.trip.endsAt,endsAt:new Date(f.trip.endsAt.getTime()+3600000)}});}));
  test('vehicle capacity cannot be bypassed',async()=>violates(async(tx,f)=>{await tx.vehicle.update({where:{id:f.vehicle.id},data:{seats:1}});return tx.resourceAllocation.create({data:{tripId:f.trip.id,resourceType:'VEHICLE',resourceId:f.vehicle.id,startsAt:f.trip.startsAt,endsAt:f.trip.endsAt}});},/capacity/));
  test('leave blocks guide allocation',async()=>violates(async(tx,f)=>{await tx.staffAvailability.create({data:{staffId:f.guide.id,startsAt:f.trip.startsAt,endsAt:f.trip.endsAt,type:'LEAVE'}});return tx.resourceAllocation.create({data:{tripId:f.trip.id,resourceType:'GUIDE',resourceId:f.guide.id,startsAt:f.trip.startsAt,endsAt:f.trip.endsAt}});},/leave conflict/));
  test('new leave cannot silently conflict with existing trip allocation',async()=>violates(async(tx,f)=>{await tx.resourceAllocation.create({data:{tripId:f.trip.id,resourceType:'GUIDE',resourceId:f.guide.id,startsAt:f.trip.startsAt,endsAt:f.trip.endsAt}});return tx.staffAvailability.create({data:{staffId:f.guide.id,startsAt:f.trip.startsAt,endsAt:f.trip.endsAt,type:'LEAVE'}});},/Staff block conflicts/));
  test('PAID seats remain reserved until staff confirmation',async()=>violates(async(tx,f)=>{const departure=await tx.packageDeparture.create({data:{packageId:f.pkg.id,startDate:f.start,endDate:f.end,capacity:2}});await tx.departureReservation.create({data:{bookingId:f.booking.id,departureId:departure.id,seats:2,state:'PAID'}});const second=await tx.booking.create({data:{customerId:f.user.customer!.id,reference:randomUUID(),source:'PACKAGE',packageId:f.pkg.id,policyVersionId:f.policy.id,startDate:f.start,endDate:f.end,adults:1,currency:'USD',totalMinor:100n,depositMinor:30n,priceSnapshot:{},policySnapshot:{}}});return tx.departureReservation.create({data:{bookingId:second.id,departureId:departure.id,seats:1,state:'HELD',expiresAt:new Date(Date.now()+3600000)}});},/capacity exceeded/));
  test('refund reservations cannot exceed captured funds',async()=>violates(async(tx,f)=>{await tx.refund.create({data:{bookingId:f.booking.id,postingId:f.capture.id,amountMinor:6000n,currency:'USD',reason:'Test refund one',requestedBy:f.user.id}});return tx.refund.create({data:{bookingId:f.booking.id,postingId:f.capture.id,amountMinor:5000n,currency:'USD',reason:'Test refund two',requestedBy:f.user.id}});},/Refund limit/));
  test('refund settlement requires matching approval',async()=>violates(async(tx,f)=>{const refund=await tx.refund.create({data:{bookingId:f.booking.id,postingId:f.capture.id,amountMinor:100n,currency:'USD',reason:'Test refund',requestedBy:f.user.id}});return tx.refundPosting.create({data:{refundId:refund.id,amountMinor:100n,currency:'USD',provider:'mock',providerReference:randomUUID(),settledAt:new Date()}});},/matching approval/));
  test('last active administrator cannot be suspended',async()=>{
    await expect(db.$transaction(async tx=>{
      let admins=await tx.user.findMany({where:{status:'ACTIVE',roles:{some:{role:'ADMIN',revokedAt:null}}}});
      if(!admins.length)admins=[await tx.user.create({data:{email:`admin-${randomUUID()}@db-integration.test`,roles:{create:{role:'ADMIN'}}}})];
      for(const admin of admins.slice(1))await tx.user.update({where:{id:admin.id},data:{status:'SUSPENDED'}});
      await tx.user.update({where:{id:admins[0]!.id},data:{status:'SUSPENDED'}});
    })).rejects.toThrow(/Last active Admin/);
  });
  test('sent quotation content is immutable',async()=>violates(async(tx,f)=>{const request=await tx.customRequest.create({data:{customerId:f.user.customer!.id,serviceId:f.pkg.categoryId,adults:2,currency:'USD',requirements:{}}});const quote=await tx.quoteVersion.create({data:{requestId:request.id,versionNumber:1,state:'SENT',currency:'USD',totalMinor:1000n,depositMinor:300n,priceSnapshot:{},policySnapshot:{},itinerary:{days:[]},createdBy:f.user.id,expiresAt:new Date(Date.now()+3600000),sentAt:new Date()}});return tx.quoteVersion.update({where:{id:quote.id},data:{totalMinor:2000n}});},/immutable/));
  test('sent quotation cannot be reset to draft to bypass immutability',async()=>violates(async(tx,f)=>{const request=await tx.customRequest.create({data:{customerId:f.user.customer!.id,serviceId:f.pkg.categoryId,adults:2,currency:'USD',requirements:{}}});const quote=await tx.quoteVersion.create({data:{requestId:request.id,versionNumber:1,state:'SENT',currency:'USD',totalMinor:1000n,depositMinor:300n,priceSnapshot:{},policySnapshot:{},itinerary:{days:[]},createdBy:f.user.id,expiresAt:new Date(Date.now()+3600000),sentAt:new Date()}});return tx.quoteVersion.update({where:{id:quote.id},data:{state:'DRAFT'}});},/cannot return to draft/));
  test('published itinerary content cannot be edited',async()=>violates((tx,f)=>tx.itineraryVersion.update({where:{id:f.itinerary.id},data:{content:{days:[{title:'Tampered'}]}}}),/immutable/));
  test('published itinerary cannot receive new day rows',async()=>violates((tx,f)=>tx.itineraryDay.create({data:{itineraryVersionId:f.itinerary.id,sequence:1,title:'Tampered day'}}),/immutable/));
});
