import {spawnSync} from 'node:child_process';
import {readdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const files=['server.mjs','model.mjs','agent-tools.mjs','contracts.mjs','mcp-server.mjs','file-import.mjs',...readdirSync('scripts').filter(f=>f.endsWith('.mjs')).map(f=>'scripts/'+f),...readdirSync('src').filter(f=>f.endsWith('.js')).map(f=>'src/'+f)];
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
console.log(`Syntax checked ${files.length} modules`);
for(const file of readdirSync('schemas').filter(f=>f.endsWith('.json')).map(f=>'schemas/'+f))JSON.parse(readFileSync(file,'utf8'));
const {schemaDocuments,validateSchemaDocument}=await import('../contracts.mjs');
for(const schema of schemaDocuments){const result=validateSchemaDocument(schema);if(!result.valid){console.error(`Invalid JSON Schema ${schema.$id}`,result.errors);process.exit(1)}}
console.log(`Meta-validated ${schemaDocuments.length} JSON Schemas with Ajv 8`);
const r=spawnSync(process.execPath,['--test'],{stdio:'inherit'});process.exit(r.status??1);
