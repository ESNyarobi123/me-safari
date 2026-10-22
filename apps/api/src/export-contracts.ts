import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApp } from './app.js';
const {app,backend,document,operations}=await createApp(undefined,false);
await mkdir(resolve(import.meta.dirname,'../../../docs'),{recursive:true});
await writeFile(resolve(import.meta.dirname,'../../../docs/api.openapi.json'),JSON.stringify(document,null,2)+'\n');
console.log(`Exported ${operations.length} API operations.`);
await app.close();await backend.db.$disconnect();
