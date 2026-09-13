import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {parseEnsdf} from '../src/ensdf.js';
const [input,output,sourceUrl]=process.argv.slice(2);if(!input||!output||!sourceUrl)throw new Error('用法：node scripts/import-ensdf.mjs <ENSDF快照> <staging.json> <来源URL>');
const bytes=await readFile(resolve(input)),sha256=createHash('sha256').update(bytes).digest('hex'),result=parseEnsdf(bytes.toString('utf8'),{sourceUrl,retrievedAt:new Date().toISOString().slice(0,10),sha256});await writeFile(resolve(output),JSON.stringify(result,null,2));console.log(JSON.stringify(result.summary));
