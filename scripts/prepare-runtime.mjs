import {mkdir,symlink,access,readdir,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const dir=join(tmpdir(),'ma-safaris-runtime-'+createHash('sha256').update(root).digest('hex').slice(0,10));
await mkdir(dir,{recursive:true});
async function link(source,target){try{await access(source);}catch{return;}try{await symlink(source,target);}catch(e){if(e.code!=='EEXIST')throw e;}}
await link(resolve(root,'.tools/node_modules/node/bin/node'),join(dir,'node'));
for(const relative of ['node_modules/.bin','node_modules/.pnpm/node_modules/.bin','.tools/node_modules/.bin']){const bins=resolve(root,relative);try{for(const name of await readdir(bins))await link(join(bins,name),join(dir,name));}catch{}}
// PATH uses colons as delimiters. The user-provided checkout has a colon in its
// folder name, so commands use these temporary links for subprocess binaries.
console.log(dir);
