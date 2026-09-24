import Ajv2020 from 'ajv/dist/2020.js';
import {readFileSync} from 'node:fs';

const load=name=>JSON.parse(readFileSync(new URL(`./schemas/${name}`,import.meta.url),'utf8'));
const evidence=load('evidence.schema.json'),analysis=load('analysis-result.schema.json'),validation=load('validation-result.schema.json'),inputs=load('tool-input.schema.json'),outputs=load('tool-output.schema.json');
const schemas=[evidence,analysis,validation,inputs,outputs];
const ajv=new Ajv2020({allErrors:true,strict:true,strictRequired:false,validateFormats:false});
for(const schema of schemas){if(!ajv.validateSchema(schema))throw new Error(`Schema 自身无效 ${schema.$id}: ${ajv.errorsText(ajv.errors)}`);ajv.addSchema(schema)}

const contractNames={
  nexus_import_spectrum:['import','import'],nexus_quality_check:['spectrum','quality'],nexus_fit_energy_calibration:['calibration','calibration'],nexus_find_peaks:['analysis','analysisEnvelope'],nexus_query_gamma:['query','query'],nexus_rank_nuclide_candidates:['rank','rank'],nexus_analyze_spectrum:['analysis','analysisEnvelope'],nexus_validate_analysis:['validation','validation'],nexus_generate_report:['analysisReport','report'],nexus_generate_report_from_analysis:['reportFromAnalysis','report']
};
const compile=(root,name)=>ajv.compile({$ref:`${root.$id}#/$defs/${name}`});
const validators=new Map(Object.entries(contractNames).map(([tool,[inputName,outputName]])=>[tool,{input:compile(inputs,inputName),output:compile(outputs,outputName)}]));

function formatErrors(errors=[]){return errors.map(e=>`${e.instancePath||'/'} ${e.message}`).join('; ')}
function schemaError(kind,tool,errors){const error=new Error(`${tool} ${kind==='input'?'输入':'输出'}不符合 V1.3 JSON Schema：${formatErrors(errors)}`);error.code=kind==='input'?'INPUT_SCHEMA_VALIDATION_FAILED':'OUTPUT_SCHEMA_VALIDATION_FAILED';error.schemaErrors=structuredClone(errors||[]);return error}
export function validateToolInput(tool,value){const fn=validators.get(tool)?.input;if(!fn)throw Object.assign(new Error(`未知工具：${tool}`),{code:'UNKNOWN_TOOL'});if(!fn(value))throw schemaError('input',tool,fn.errors);return value}
export function validateToolOutput(tool,value){const fn=validators.get(tool)?.output;if(!fn)throw Object.assign(new Error(`未知工具：${tool}`),{code:'UNKNOWN_TOOL'});if(!fn(value))throw schemaError('output',tool,fn.errors);return value}
export function validateSchemaDocument(schema){const valid=ajv.validateSchema(schema);return {valid,errors:valid?[]:structuredClone(ajv.errors||[])}}

function publicRoot(root,name){
  const defs=structuredClone(root.$defs),rewrite=value=>{if(Array.isArray(value))return value.map(rewrite);if(!value||typeof value!=='object')return value;if(value.$ref==='evidence.schema.json')return {$ref:'#/$defs/nuclideEvidence'};if(value.$ref==='analysis-result.schema.json')return {$ref:'#/$defs/analysisResult'};if(value.$ref==='validation-result.schema.json')return {$ref:'#/$defs/validationResult'};return Object.fromEntries(Object.entries(value).filter(([k])=>!['$schema','$id','$defs'].includes(k)).map(([k,v])=>[k,rewrite(v)]))};
  Object.assign(defs,evidence.$defs,validation.$defs,{nuclideEvidence:rewrite(evidence),analysisResult:rewrite(analysis),validationResult:rewrite(validation)});
  const selected=root.$defs[name],inline=selected.$ref==='evidence.schema.json'?evidence:selected.$ref==='analysis-result.schema.json'?analysis:selected.$ref==='validation-result.schema.json'?validation:selected;
  return {$schema:'https://json-schema.org/draft/2020-12/schema',...rewrite(inline),$defs:rewrite(defs)};
}
export function toolSchemas(tool){const names=contractNames[tool];if(!names)return null;return {inputSchema:publicRoot(inputs,names[0]),outputSchema:publicRoot(outputs,names[1])}}
export const schemaDocuments=schemas;
