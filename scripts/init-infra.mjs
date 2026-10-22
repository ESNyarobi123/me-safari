import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const sql=`SELECT 'CREATE DATABASE ma_safaris_test OWNER ma_dev' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='ma_safaris_test')\n\\gexec\n`;
const child=spawn('docker',['compose','exec','-T','postgres','psql','-U','ma_dev','-d','postgres','-v','ON_ERROR_STOP=1'],{cwd:resolve(import.meta.dirname,'..'),stdio:['pipe','inherit','inherit']});
child.stdin.end(sql);
await new Promise((ok,bad)=>{child.on('error',bad);child.on('close',code=>code===0?ok():bad(new Error(`Infrastructure initialization exited ${code}`)));});
