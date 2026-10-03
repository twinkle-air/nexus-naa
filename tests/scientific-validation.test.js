import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {executeAgentTool} from '../agent-tools.mjs';
import {syntheticDemo} from '../src/demo.js';
import {buildEvidence,rankNuclideCandidates,fitGaussianDoublet} from '../src/core.js';
import {validateAnalysis,analysisFingerprint} from '../src/validation.js';
import {htmlReport} from '../src/report.js';

const db=JSON.parse(readFileSync(new URL('../data/nuclear-lines.json',import.meta.url),'utf8'));
const args={spectrumText:syntheticDemo(),filename:'SYNTHETIC-scientific-validation.csv',calibrationText:'0,0\n1500,1500'};
async function normal(){return (await executeAgentTool('nexus_analyze_spectrum',args)).result}
function reseal(r){r.nuclideCandidates=rankNuclideCandidates(r.matching,db,r.calibration);r.evidence=buildEvidence(r.spectrum,r.calibration,r.matching,db);return r}

test('original jointly edited reference-energy counterexample is rejected',async()=>{
  const r=await normal();r.matching[0].candidates[0].energyKeV=1198.228;
  reseal(r); // Also changes nuclear-data evidence, claims and nuclide summaries.
  const v=await executeAgentTool('nexus_validate_analysis',{analysis:r});
  assert.equal(v.valid,false);assert.ok(v.errors.some(e=>e.code==='DATABASE_RECORD_MISMATCH'));
  assert.ok(v.errors.some(e=>e.code==='MATCHING_REPLAY_MISMATCH'));
  await assert.rejects(executeAgentTool('nexus_generate_report_from_analysis',{analysis:r}),e=>e.code==='ANALYSIS_VALIDATION_FAILED');
  assert.throws(()=>htmlReport(r,'zh',db),e=>e.code==='ANALYSIS_VALIDATION_FAILED');
});

const edits={
  energy:c=>{c.energyKeV+=25;c.deltaKeV-=25;c.absDeltaKeV=Math.abs(c.deltaKeV)},
  nuclide:c=>{c.nuclide='Eu-154'},
  intensity:c=>{c.intensityPercent=1},
  radiationType:c=>{c.mode='annihilation'},
  sourceId:c=>{c.sourceId='COMPETITION_LIBRARY_2026';c.source=db.sources[c.sourceId]},
  sourceUrl:c=>{c.sourceUrl='https://example.invalid/forged'},
  sourceMetadata:c=>{c.source.name='forged source'},
  unknownId:c=>{c.id='FORGED-RECORD'},
  substitutedId:c=>{c.id='IAEA2008-20'},
  residual:c=>{c.deltaKeV=0;c.absDeltaKeV=0},
  support:c=>{c.supportEligible=false;c.supportExclusionReasons=['OUTSIDE_SUPPORT_WINDOW'];c.status='tentative'},
  supportWindow:c=>{c.supportWindowKeV=99},
  score:c=>{c.score=1},
  companionEnergy:c=>{c.companions[0].energyKeV+=10},
  companionIntensity:c=>{c.companions[0].intensityPercent=1},
  companionId:c=>{c.companions[0].lineId='FORGED-COMPANION'},
  companionQualification:c=>{c.companions[0].supportEligible=false},
  interference:c=>{c.interferences.push({type:'possible_sum_peak',relatedPeakIds:[1,2],note:'forged'})}
};
for(const [label,edit] of Object.entries(edits))test(`joint line/evidence/summary tamper: ${label}`,async()=>{
  const r=await normal();edit(r.matching[0].candidates[0]);reseal(r);
  assert.notEqual(analysisFingerprint(r),analysisFingerprint(await normal()));
  const v=await executeAgentTool('nexus_validate_analysis',{analysis:r});assert.equal(v.valid,false,label);
  await assert.rejects(executeAgentTool('nexus_generate_report_from_analysis',{analysis:r}),e=>e.code==='ANALYSIS_VALIDATION_FAILED');
});

test('duplicate and omitted matches cannot pass after summaries are rebuilt',async()=>{
  for(const edit of [r=>r.matching[0].candidates.push(structuredClone(r.matching[0].candidates[0])),r=>r.matching.pop(),r=>r.matching[0].candidates.pop()]){
    const r=await normal();edit(r);reseal(r);assert.equal(validateAnalysis(r,db).valid,false);
  }
});

test('QC, calibration, peak and database metadata are independently recomputed',async()=>{
  const cases=[['QC_REPLAY_MISMATCH',r=>r.qc.summary.totalCounts++],['CALIBRATION_REPLAY_MISMATCH',r=>r.calibration.rmse=1],['CALIBRATION_REPLAY_MISMATCH',r=>r.calibration.referenceRangeKeV[1]=2000],['PEAK_REPLAY_MISMATCH',r=>r.peaks[0].energyKeV+=25],['PEAK_REPLAY_MISMATCH',r=>r.peaks[0].fwhmChannels+=1],['PEAK_REPLAY_MISMATCH',r=>r.peaks[0].netArea+=10],['DATABASE_METADATA_MISMATCH',r=>r.database.sources.IAEA_2008.version='forged']];
  for(const [code,edit] of cases){const r=await normal();edit(r);reseal(r);const v=validateAnalysis(r,db);assert.equal(v.valid,false);assert.ok(v.errors.some(e=>e.code===code),code)}
});

test('matching validation without external trusted records fails closed',async()=>{
  const r=await normal();assert.equal(validateAnalysis(r).valid,false);
  assert.throws(()=>htmlReport(r),e=>e.code==='ANALYSIS_VALIDATION_FAILED');
  assert.ok(validateAnalysis(r).errors.some(e=>e.code==='TRUSTED_DATABASE_REQUIRED'));
});

test('nested schemas reject missing, malformed, extra and non-finite fields',async()=>{
  const cases=[r=>delete r.peaks[0].centroidChannel,r=>{r.peaks[0].height='100'},r=>{r.peaks[0].unexpected=1},r=>{r.peaks[0].energyKeV=NaN},r=>{r.matching[0].candidates[0].energyKeV=Infinity},r=>{r.matching[0].candidates[0].intensityPercent=-1},r=>delete r.matching[0].candidates[0].deltaKeV,r=>{r.calibration.slope=0},r=>delete r.calibration.points[0].residualKeV,r=>{r.evidence.evidence[0].unexpected=true},r=>{r.evidence.claims[0].score='100'},r=>{r.qc.summary.totalCounts=null}];
  for(const edit of cases){const r=await normal();edit(r);for(const tool of ['nexus_validate_analysis','nexus_generate_report_from_analysis'])await assert.rejects(executeAgentTool(tool,{analysis:r}),e=>e.code==='INPUT_SCHEMA_VALIDATION_FAILED')}
  for(const input of [{},null,{matching:[null]}])assert.equal(validateAnalysis(input,db).valid,false);
});

test('valid calibrated and uncalibrated snapshots replay in every peak mode',async()=>{
  for(const detectionMode of ['adaptive','snip','global'])for(const calibrationText of ['',args.calibrationText]){
    const {result}=await executeAgentTool('nexus_analyze_spectrum',{...args,calibrationText,settings:{detectionMode}});
    const v=await executeAgentTool('nexus_validate_analysis',{analysis:result});assert.equal(v.valid,true,JSON.stringify(v.errors));
    assert.ok((await executeAgentTool('nexus_generate_report_from_analysis',{analysis:result})).html.includes(v.fingerprint));
  }
});

test('overlap-fit structure is checked and its numbers cannot be inserted into an unrelated peak',async()=>{
  const r=await normal();const counts=Array.from({length:120},(_,i)=>10+80*Math.exp(-.5*((i-48)/3)**2)+60*Math.exp(-.5*((i-58)/3)**2));
  r.peaks[0].overlapFit=fitGaussianDoublet(counts,{index:48,fwhmChannels:7},{index:58,fwhmChannels:7});
  assert.equal((await executeAgentTool('nexus_validate_analysis',{analysis:r})).valid,false);
  r.peaks[0].overlapFit.components[0].sigmaChannels='3';
  await assert.rejects(executeAgentTool('nexus_validate_analysis',{analysis:r}),e=>e.code==='INPUT_SCHEMA_VALIDATION_FAILED');
});

test('legitimate overlap-fit snapshot passes replay and a modified fit fails',async()=>{
  const spectrumText=Array.from({length:120},(_,i)=>`${i},${10+800*Math.exp(-.5*((i-48)/2)**2)+700*Math.exp(-.5*((i-53)/2)**2)}`).join('\n');
  const {result}=await executeAgentTool('nexus_analyze_spectrum',{spectrumText,calibrationText:'0,0\n119,119',settings:{smoothingWindow:3,minDistance:3,minSignificance:2,fitOverlaps:true}});
  assert.ok(result.peaks.some(p=>p.overlapFit));
  assert.equal((await executeAgentTool('nexus_validate_analysis',{analysis:result})).valid,true);
  result.peaks.find(p=>p.overlapFit).overlapFit.components[0].height+=1;
  assert.equal((await executeAgentTool('nexus_validate_analysis',{analysis:result})).valid,false);
});

test('direct report validation rejects NaN in nullable uncalibrated energy',async()=>{
  const {result}=await executeAgentTool('nexus_find_peaks',{spectrumText:args.spectrumText});
  result.peaks[0].energyKeV=NaN;
  assert.equal(validateAnalysis(result,db).valid,false);
  assert.throws(()=>htmlReport(result,'zh',db),e=>e.code==='ANALYSIS_VALIDATION_FAILED');
});

test('editing a returned query source cannot change the tool trusted database',async()=>{
  const before=await normal();
  const q=await executeAgentTool('nexus_query_gamma',{energyKeV:1173.228});
  q.query.rows[0].source.name='forged source';
  const after=await normal();
  assert.equal(after.matching[0].candidates[0].source.name,before.matching[0].candidates[0].source.name);
  assert.equal((await executeAgentTool('nexus_validate_analysis',{analysis:after})).valid,true);
});
