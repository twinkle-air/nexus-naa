import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {evaluateHostBehavior} from '../src/host-eval.js';

const load=async path=>JSON.parse(await readFile(path,'utf8'));
const root=new URL('..',import.meta.url),caseSet=await load(new URL('../tests/host-behavior-cases.json',import.meta.url));
const input=process.argv[2]?resolve(process.argv[2]):new URL('../tests/fixtures/host-behavior-policy-fixture.json',import.meta.url);
const result=evaluateHostBehavior(caseSet,await load(input));
console.log(JSON.stringify(result,null,2));
if(result.summary.passed!==result.summary.total)process.exitCode=1;
