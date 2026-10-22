import { createApp } from './app.js';
import { config } from '@ma/backend';
const {app,backend}=await createApp();
await app.listen(config.API_PORT,config.API_HOST);
console.log(JSON.stringify({level:'info',service:'api',event:'started',listen:`${config.API_HOST}:${config.API_PORT}`,publicBase:config.PUBLIC_API_BASE_URL,...(config.NODE_ENV!=='production'?{swagger:`http://127.0.0.1:${config.API_PORT}/v1/docs`}:{})}));
let closing=false;
const shutdown=async(signal:string)=>{
 if(closing)return;
 closing=true;
 console.log(JSON.stringify({level:'info',service:'api',event:'shutdown_started',signal}));
 const force=setTimeout(()=>{console.error(JSON.stringify({level:'error',service:'api',event:'shutdown_forced',signal}));process.exit(1);},10000);
 force.unref();
 try{await app.close();await backend.db.$disconnect();clearTimeout(force);console.log(JSON.stringify({level:'info',service:'api',event:'shutdown_complete',signal}));process.exit(0);}
 catch(error){clearTimeout(force);console.error(JSON.stringify({level:'error',service:'api',event:'shutdown_failed',signal,errorType:error instanceof Error?error.name:'Unknown'}));process.exit(1);}
};
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>void shutdown(signal));
