import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Controller,Module,Req,Res,Get,Post,Patch,Put,Delete,Catch,type ExceptionFilter,type ArgumentsHost,type HttpException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter,RouteConfig,type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule,DocumentBuilder,ApiTags,ApiBody,ApiResponse,ApiBearerAuth,ApiHeader,ApiParam,ApiOperation } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyRequest,FastifyReply } from 'fastify';
import { z,ZodError } from 'zod';
import { createBackend,config,DomainError,serialize,fail,isAllowedWebOrigin,type Backend } from '@ma/backend';
import { buildRoutes,type Binary,type Operation } from './routes.js';
type RawRequest=FastifyRequest & {rawBody?:Buffer};
const methods={GET:Get,POST:Post,PATCH:Patch,PUT:Put,DELETE:Delete};
function schema(value:z.ZodType,io:'input'|'output'='input') {const {$schema,...rest}=z.toJSONSchema(value,{io,unrepresentable:'any'});return rest;}
class ErrorFilter implements ExceptionFilter {
 catch(e:unknown,host:ArgumentsHost){const reply=host.switchToHttp().getResponse<FastifyReply>(),request=host.switchToHttp().getRequest<FastifyRequest>();const requestId=String(request.id);let status=500,code='INTERNAL_ERROR',message='The operation could not be completed.',details:Record<string,unknown>={};
  if(e instanceof DomainError){status=e.status;code=e.code;message=e.message;details=e.details;}else if(e instanceof ZodError){status=e.issues.some(i=>i.code==='unrecognized_keys')?400:422;code='VALIDATION_FAILED';message='Check the highlighted fields.';details={fields:e.issues.map(i=>({field:i.path.join('.'),message:i.message}))};}else{const dbCode=(e as {code?:string})?.code;if(dbCode==='P2025'){status=404;code='NOT_FOUND';message='Record unavailable.';}else if(dbCode==='P2002'){status=409;code='CONFLICT';message='A conflicting record already exists.';}else if(dbCode==='P1001'||dbCode==='P1002'){status=503;code='DEPENDENCY_UNAVAILABLE';message='A required dependency is unavailable.';}else if(typeof(e as HttpException)?.getStatus==='function'){status=(e as HttpException).getStatus();code=status===404?'NOT_FOUND':status===429?'RATE_LIMITED':'REQUEST_FAILED';message=status===404?'Endpoint unavailable.':'The request could not be accepted.';}else if((e as {statusCode?:number})?.statusCode){status=(e as {statusCode:number}).statusCode;code=status===429?'RATE_LIMITED':'VALIDATION_FAILED';message=status===429?'Too many requests. Try again shortly.':'Malformed request.';}}
  if(status>=500)console.error(JSON.stringify({level:'error',requestId,code,errorType:e instanceof Error?e.name:'Unknown'}));reply.status(status).header('X-Request-Id',requestId).header('Cache-Control','no-store').send({error:{code,message,details,requestId}});
 }
}
export async function createApp(backend:Backend=createBackend(),withSwagger=true) {
 const operations=buildRoutes(backend);
 @Controller() class ApiController {}
 for(const [index,op] of operations.entries()) {
  const key=`operation${index}`;
  Object.defineProperty(ApiController.prototype,key,{value:async function(request:RawRequest,reply:FastifyReply){
   const params=request.params as Record<string,string>;for(const [key,value]of Object.entries(params))if(/(?:^id$|Id$)/.test(key)&&!z.string().uuid().safeParse(value).success)fail(400,'VALIDATION_FAILED','Invalid resource identifier.',{field:key});
   const query=request.query as Record<string,string|undefined>;if(query.limit&&(!/^\d+$/.test(query.limit)||Number(query.limit)>50))fail(422,'VALIDATION_FAILED','Pagination limit must be between 1 and 50.');if(query.search&&query.search.length>100)fail(422,'VALIDATION_FAILED','Search is limited to 100 characters.');
   const actor=op.public?undefined:await backend.auth.authenticate(request.headers.authorization,typeof request.headers['x-role-context']==='string'?request.headers['x-role-context']:undefined,String(request.id));
   const keyHeader=request.headers['idempotency-key'];if(op.idempotent&&typeof keyHeader!=='string')fail(400,'IDEMPOTENCY_KEY_REQUIRED','Send a stable Idempotency-Key for this command.');
   const result=await op.run({actor,params,query,requestId:String(request.id),rawBody:request.rawBody,headers:request.headers,ip:typeof request.headers['x-forwarded-for']==='string'?request.ip:undefined,command:{key:typeof keyHeader==='string'?keyHeader:undefined,reauthToken:typeof request.headers['x-reauthentication-token']==='string'?request.headers['x-reauthentication-token']:undefined}},request.body??{});
   reply.status(op.status).header('X-Request-Id',String(request.id)).header('Cache-Control',op.public&&op.method==='GET'?'public, max-age=30':'private, no-store');
   if(result&&typeof result==='object'&&'buffer'in result&&Buffer.isBuffer(result.buffer)){const binary=result as Binary;reply.header('Content-Type',binary.mime);if(binary.filename)reply.header('Content-Disposition',`attachment; filename="${binary.filename}"`);return reply.send(binary.buffer);}
   const limit=Math.min(50,Math.max(1,Number(query.limit)||20));const data=serialize(result);const array=Array.isArray(data);const last=array?data[data.length-1] as {id?:string}|undefined:undefined;
   return {data,meta:{requestId:String(request.id),...(array?{limit,hasMore:data.length===limit,nextCursor:data.length===limit?last?.id??null:null}:{})}};
  },writable:false});
  const descriptor=Object.getOwnPropertyDescriptor(ApiController.prototype,key)!;
  methods[op.method](op.path)(ApiController.prototype,key,descriptor);Req()(ApiController.prototype,key,0);Res({passthrough:true})(ApiController.prototype,key,1);
  ApiTags(op.path.split('/')[0]!)(ApiController.prototype,key,descriptor);ApiOperation({operationId:`${op.method.toLowerCase()}_${op.path.replaceAll(/[^a-zA-Z0-9]/g,'_')}`,summary:op.summary})(ApiController.prototype,key,descriptor);
  if(!op.public){ApiBearerAuth()(ApiController.prototype,key,descriptor);ApiHeader({name:'X-Role-Context',required:false,schema:{type:'string',enum:['CUSTOMER','OPERATIONS','DRIVER_GUIDE','ADMIN']}})(ApiController.prototype,key,descriptor);}
  if(op.idempotent)ApiHeader({name:'Idempotency-Key',required:true,schema:{type:'string'}})(ApiController.prototype,key,descriptor);
  if(op.method!=='GET'&&op.method!=='DELETE')ApiBody({schema:schema(op.schema) as never})(ApiController.prototype,key,descriptor);
  ApiResponse({status:op.status,schema:{type:'object',required:['data','meta'],properties:{data:schema(op.response,'output') as never,meta:{type:'object',properties:{requestId:{type:'string'},nextCursor:{type:'string',nullable:true},hasMore:{type:'boolean'},limit:{type:'integer'}}}}}})(ApiController.prototype,key,descriptor);
  for(const status of [400,401,403,404,409,422,429,503])ApiResponse({status,description:'Stable error envelope; see docs/api-contracts.md.',schema:{type:'object',properties:{error:{type:'object',required:['code','message','requestId'],properties:{code:{type:'string'},message:{type:'string'},requestId:{type:'string'},details:{type:'object',additionalProperties:true}}}}}})(ApiController.prototype,key,descriptor);
  for(const match of op.path.matchAll(/:([\w]+)/g))ApiParam({name:match[1]!,schema:{type:'string'}})(ApiController.prototype,key,descriptor);
  if(op.path.startsWith('auth/'))RouteConfig({rateLimit:{max:30,timeWindow:'1 minute'}})(ApiController.prototype,key,descriptor);
  if(op.path==='public/inquiries')RouteConfig({rateLimit:config.NODE_ENV==='production'?{max:10,timeWindow:'10 minutes'}:{max:200,timeWindow:'10 minutes'}})(ApiController.prototype,key,descriptor);
 }
 @Module({controllers:[ApiController]}) class ApiModule {}
 const adapter=new FastifyAdapter({bodyLimit:16*1024*1024,trustProxy:config.TRUST_PROXY,genReqId:()=>randomUUID(),logger:false});
 adapter.getInstance().addContentTypeParser(['image/jpeg','image/png','image/webp','application/pdf','application/octet-stream'],{parseAs:'buffer'},(_req,body,done)=>done(null,body));
 const app=await NestFactory.create<NestFastifyApplication>(ApiModule,adapter,{rawBody:true,logger:['error','warn']});
 app.setGlobalPrefix('v1');app.useGlobalFilters(new ErrorFilter());
 const instance=app.getHttpAdapter().getInstance();
 instance.addHook('onResponse',(request,reply,done)=>{
  const route=(request as FastifyRequest&{routeOptions?:{url?:string}}).routeOptions?.url??request.url.split('?')[0]!;
  if(route==='/v1/health/live'||route==='/v1/health/ready'){done();return;}
  console.log(JSON.stringify({level:reply.statusCode>=500?'error':reply.statusCode>=400?'warn':'info',service:'api',requestId:String(request.id),method:request.method,route,status:reply.statusCode,durationMs:Math.round(reply.elapsedTime)}));
  done();
 });
 const corsOrigin=(origin:string|undefined,callback:(error:Error|null,allow?:boolean)=>void)=>callback(null,isAllowedWebOrigin(origin));
 app.enableCors({origin:corsOrigin as never,allowedHeaders:['Content-Type','Authorization','Idempotency-Key','X-Role-Context','X-Reauthentication-Token'],exposedHeaders:['Content-Disposition','X-Request-Id'],methods:['GET','POST','PATCH','PUT','DELETE'],credentials:false});
 await app.register(helmet,{contentSecurityPolicy:config.NODE_ENV==='production'?undefined:false});await app.register(rateLimit,{global:true,max:120,timeWindow:'1 minute'});
 const document=SwaggerModule.createDocument(app,new DocumentBuilder().setTitle('M&A Safaris API').setDescription('Server-authorized business contracts. Money uses integer minor-unit decimal strings. Development payments are local simulations, no real money.').setVersion('1.0.0').addBearerAuth().build());
 if(withSwagger&&config.NODE_ENV!=='production')SwaggerModule.setup('v1/docs',app,document);
 await app.init();await app.getHttpAdapter().getInstance().ready();return {app,backend,document,operations};
}
