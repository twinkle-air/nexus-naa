import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const files=['server.mjs','model.mjs','agent-tools.mjs','mcp-server.mjs','file-import.mjs','scripts/import-ensdf.mjs',...readdirSync('src').filter(f=>f.endsWith('.js')).map(f=>'src/'+f)];
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
console.log(`Syntax checked ${files.length} modules`);
const r=spawnSync(process.execPath,['--test'],{stdio:'inherit'});process.exit(r.status??1);
