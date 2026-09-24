import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import {agentTools,executeAgentTool} from '../agent-tools.mjs';
import {schemaDocuments,validateSchemaDocument,validateToolOutput} from '../contracts.mjs';
import {syntheticDemo} from '../src/demo.js';

const analysisArgs={spectrumText:syntheticDemo(),filename:'v12-contract.csv',calibrationText:'0,0\n1500,1500'};

test('all source schemas meta-validate and all MCP schemas compile independently',()=>{
  for(const schema of schemaDocuments)assert.deepEqual(validateSchemaDocument(schema),{valid:true,errors:[]});
  assert.equal(agentTools.length,10);
  for(const tool of agentTools){
    const ajv=new Ajv2020({strict:false,validateFormats:false});
    assert.doesNotThrow(()=>ajv.compile(tool.inputSchema),`${tool.name} inputSchema`);
    assert.doesNotThrow(()=>ajv.compile(tool.outputSchema),`${tool.name} outputSchema`);
    assert.equal(tool.inputSchema.additionalProperties,false,`${tool.name} input must be closed`);
    assert.equal(tool.outputSchema.additionalProperties,false,`${tool.name} output must be closed`);
  }
});

test('runtime input and output schemas reject wrong types, omissions and extras',async()=>{
  await assert.rejects(executeAgentTool('nexus_analyze_spectrum',{filename:'missing.csv'}),error=>error.code==='INPUT_SCHEMA_VALIDATION_FAILED');
  await assert.rejects(executeAgentTool('nexus_query_gamma',{energyKeV:'661.657'}),error=>error.code==='INPUT_SCHEMA_VALIDATION_FAILED');
  await assert.rejects(executeAgentTool('nexus_query_gamma',{energyKeV:661.657,unexpected:true}),error=>error.code==='INPUT_SCHEMA_VALIDATION_FAILED');
  assert.throws(()=>validateToolOutput('nexus_query_gamma',{summary:'x'}),error=>error.code==='OUTPUT_SCHEMA_VALIDATION_FAILED');
  const analyzed=await executeAgentTool('nexus_analyze_spectrum',analysisArgs),illegal=structuredClone(analyzed.result);
  illegal.nuclideCandidates[0].status='confirmed';
  await assert.rejects(executeAgentTool('nexus_validate_analysis',{analysis:illegal}),error=>error.code==='INPUT_SCHEMA_VALIDATION_FAILED');
});

test('all ten tools return values accepted by their runtime output contracts',async()=>{
  await executeAgentTool('nexus_import_spectrum',{filename:'tiny.csv',fileText:'0,1\n1,2\n2,1'});
  await executeAgentTool('nexus_quality_check',{spectrumText:analysisArgs.spectrumText,filename:'qc.csv'});
  await executeAgentTool('nexus_fit_energy_calibration',{calibrationText:analysisArgs.calibrationText});
  await executeAgentTool('nexus_find_peaks',analysisArgs);
  await executeAgentTool('nexus_query_gamma',{energyKeV:661.657,toleranceKeV:0.2});
  await executeAgentTool('nexus_rank_nuclide_candidates',analysisArgs);
  const analyzed=await executeAgentTool('nexus_analyze_spectrum',analysisArgs);
  await executeAgentTool('nexus_validate_analysis',{analysis:analyzed.result});
  await executeAgentTool('nexus_generate_report',analysisArgs);
  await executeAgentTool('nexus_generate_report_from_analysis',{analysis:analyzed.result,language:'en'});
});

test('every reportable nuclide field is rebuilt from line-level evidence',async()=>{
  const analyzed=await executeAgentTool('nexus_analyze_spectrum',analysisArgs);
  const index=analyzed.result.nuclideCandidates.findIndex(candidate=>candidate.nuclide==='Co-60');
  assert.notEqual(index,-1);
  const cases=[
    ['status',candidate=>{candidate.status=candidate.status==='supported'?'tentative':'supported'},'NUCLIDE_STATUS_MISMATCH'],
    ['score',candidate=>{candidate.score=candidate.score===100?99:candidate.score+1},'NUCLIDE_SCORE_MISMATCH'],
    ['matched_lines',candidate=>{candidate.matched_lines[0].observed_energy_keV+=0.01},'NUCLIDE_MATCHED_LINES_MISMATCH'],
    ['companion_lines',candidate=>{candidate.companion_lines[0].status=candidate.companion_lines[0].status==='observed'?'expected_but_not_observed':'observed'},'NUCLIDE_COMPANION_LINES_MISMATCH'],
    ['contradictions',candidate=>{candidate.contradictions.push({code:'TAMPER',message:'tampered'})},'NUCLIDE_CONTRADICTIONS_MISMATCH'],
    ['interferences',candidate=>{candidate.interferences.push({type:'tampered'})},'NUCLIDE_INTERFERENCES_MISMATCH'],
    ['missing_information',candidate=>{candidate.missing_information.push('tampered')},'NUCLIDE_MISSING_INFORMATION_MISMATCH'],
    ['data_sources',candidate=>{candidate.data_sources[0].url='https://example.invalid/tampered'},'NUCLIDE_DATA_SOURCES_MISMATCH'],
    ['limitations',candidate=>{candidate.limitations.push('tampered')},'NUCLIDE_LIMITATIONS_MISMATCH'],
    ['calibration_assessment',candidate=>{candidate.calibration_assessment.interpretation+=' tampered'},'NUCLIDE_CALIBRATION_ASSESSMENT_MISMATCH']
  ];
  for(const [field,tamper,expectedCode] of cases){
    const copy=structuredClone(analyzed.result);tamper(copy.nuclideCandidates[index]);
    const validation=await executeAgentTool('nexus_validate_analysis',{analysis:copy});
    assert.equal(validation.valid,false,field);
    assert.ok(validation.errors.some(error=>error.code===expectedCode),`${field}: ${validation.errors.map(x=>x.code).join(', ')}`);
  }
});

test('exact-snapshot report preserves fingerprint and rejects a modified snapshot',async()=>{
  const analyzed=await executeAgentTool('nexus_analyze_spectrum',analysisArgs);
  const validation=await executeAgentTool('nexus_validate_analysis',{analysis:analyzed.result});
  const report=await executeAgentTool('nexus_generate_report_from_analysis',{analysis:analyzed.result,language:'zh'});
  assert.equal(report.analysisFingerprint,validation.fingerprint);
  assert.match(report.filename,new RegExp(validation.fingerprint));
  assert.match(report.html,new RegExp(validation.fingerprint));
  const tampered=structuredClone(analyzed.result);
  tampered.nuclideCandidates[0].missing_information.push('report tamper');
  await assert.rejects(executeAgentTool('nexus_generate_report_from_analysis',{analysis:tampered}),error=>error.code==='ANALYSIS_VALIDATION_FAILED');
});
