import { startWorker } from '@ma/backend/jobs';

const runtime=await startWorker();
console.log(JSON.stringify({level:'info',service:'worker',event:'started',message:'M&A Safaris durable outbox worker started'}));
let closing=false;
const close=async(signal:string)=>{
 if(closing)return;
 closing=true;
 console.log(JSON.stringify({level:'info',service:'worker',event:'shutdown_started',signal}));
 const force=setTimeout(()=>{console.error(JSON.stringify({level:'error',service:'worker',event:'shutdown_forced',signal}));process.exit(1);},10000);
 force.unref();
 try{await runtime.close();clearTimeout(force);console.log(JSON.stringify({level:'info',service:'worker',event:'shutdown_complete',signal}));process.exit(0);}
 catch(error){clearTimeout(force);console.error(JSON.stringify({level:'error',service:'worker',event:'shutdown_failed',signal,errorType:error instanceof Error?error.name:'Unknown'}));process.exit(1);}
};
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>void close(signal));
