import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {executeAgentTool} from '../agent-tools.mjs';
import {syntheticDemo} from '../src/demo.js';

const calibration='0,0\n1500,1500';
const gaussian=(energies,length=1700)=>'channel,counts\n'+Array.from({length},(_,i)=>{
  const counts=5+energies.reduce((sum,[energy,height=1000,width=3])=>sum+height*Math.exp(-.5*((i-energy)/width)**2),0);
  return `${i},${Math.round(counts)}`;
}).join('\n');

async function analyze(spectrumText=syntheticDemo(),extra={}){
  return executeAgentTool('nexus_analyze_spectrum',{spectrumText,filename:'conformance.csv',calibrationText:calibration,...extra});
}

test('C01 complete Co-60 workflow yields a supported two-line nuclide candidate',async()=>{
  const out=await analyze();
  const co=out.result.nuclideCandidates.find(x=>x.nuclide==='Co-60');
  assert.equal(co.status,'supported');
  assert.equal(new Set(co.matched_lines.map(x=>x.reference_line_id)).size,2);
});

test('C02 isolated 511 keV line never becomes a supported nuclide conclusion',async()=>{
  const out=await analyze(gaussian([[511]]));
  const sodium=out.result.nuclideCandidates.find(x=>x.nuclide==='Na-22');
  assert.ok(sodium);
  assert.notEqual(sodium.status,'supported');
  assert.ok(sodium.contradictions.some(x=>x.code==='NON_UNIQUE_511_KEV'));
});

test('C03 uncalibrated analysis stops after peak finding',async()=>{
  const out=await executeAgentTool('nexus_analyze_spectrum',{spectrumText:syntheticDemo(),filename:'uncalibrated.csv'});
  assert.ok(out.result.peaks.length>0);
  assert.equal(out.result.matching,null);
  assert.equal(out.result.nuclideCandidates,null);
  assert.ok(out.result.warnings.some(x=>x.includes('尚未标定')));
});

test('C04 two-point calibration is explicitly marked unverified',async()=>{
  const out=await analyze();
  assert.equal(out.result.calibration.validationStatus,'two_point_unverified');
  assert.ok(out.result.warnings.some(x=>x.includes('两点')));
});

test('C05 calibration extrapolation blocks supported conclusions',async()=>{
  const out=await analyze(syntheticDemo(),{calibrationText:'600,600\n700,700'});
  assert.ok(out.result.matching.every(x=>x.calibrationUse==='extrapolated'));
  assert.ok(out.result.nuclideCandidates.every(x=>x.status!=='supported'));
  assert.ok(out.result.warnings.some(x=>x.includes('外推')));
});

test('C06 discontinuous channels are a blocking QC condition for peak finding',async()=>{
  const spectrumText='channel,counts\n0,1\n1,2\n3,8\n4,1';
  const qc=await executeAgentTool('nexus_quality_check',{spectrumText,filename:'gap.csv'});
  assert.deepEqual(qc.blocking,['DISCONTINUOUS_CHANNELS']);
  await assert.rejects(()=>executeAgentTool('nexus_find_peaks',{spectrumText,filename:'gap.csv'}),/连续/);
});

test('C07 mixed spectrum preserves distinct evidence IDs and nuclide-level evidence',async()=>{
  const out=await analyze(gaussian([[661.657,900],[1173.228,1000],[1332.492,1000]]));
  const co=out.result.nuclideCandidates.find(x=>x.nuclide==='Co-60');
  const cs=out.result.nuclideCandidates.find(x=>x.nuclide==='Cs-137');
  assert.equal(co.status,'supported');
  assert.equal(cs.status,'insufficient_evidence');
  assert.ok(cs.matched_lines.some(line=>line.support_exclusion_reasons.includes('UNRESOLVED_PEAK_ARTIFACT')));
  const ids=out.result.evidence.evidence.map(x=>x.id);
  assert.equal(new Set(ids).size,ids.length);
});

test('C08 an absent companion line is not a contradiction without observability data',async()=>{
  const out=await analyze(gaussian([[1173.228,1000]]));
  const co=out.result.nuclideCandidates.find(x=>x.nuclide==='Co-60');
  assert.equal(co.status,'tentative');
  assert.ok(co.companion_lines.some(x=>x.status==='not_assessable'));
  assert.ok(!co.contradictions.some(x=>x.code==='EXPECTED_LINE_MISSING'));
});

test('C09 Skill contract refuses warning suppression and preserves stop rules',async()=>{
  const skill=await readFile(new URL('../SKILL.md',import.meta.url),'utf8');
  assert.match(skill,/不得删除、淡化或覆盖工具产生的警告/);
  assert.match(skill,/停止条件/);
  assert.match(skill,/不得继续/);
});

test('C10 validator rejects a tampered candidate-to-evidence link',async()=>{
  const out=await analyze();
  const tampered=structuredClone(out.result);
  tampered.matching[0].candidates[0].deltaKeV+=1;
  const validation=await executeAgentTool('nexus_validate_analysis',{analysis:tampered});
  assert.equal(validation.valid,false);
  assert.ok(validation.errors.some(x=>x.code==='CANDIDATE_EVIDENCE_MISMATCH'));
  const fabricated=structuredClone(out.result);
  fabricated.evidence.claims[0].statement='已确认检出并完成定量';
  const claimValidation=await executeAgentTool('nexus_validate_analysis',{analysis:fabricated});
  assert.equal(claimValidation.valid,false);
  assert.ok(claimValidation.errors.some(x=>x.code==='CLAIM_CONTENT_MISMATCH'));
});

test('C11 local nuclear-data query remains usable without a network dependency',async()=>{
  const out=await executeAgentTool('nexus_query_gamma',{energyKeV:661.657,toleranceKeV:.1});
  assert.equal(out.query.rows[0].nuclide,'Cs-137');
  assert.ok(out.database.datasetId);
});

test('C12 identical inputs produce identical scientific results and fingerprints',async()=>{
  const first=await analyze(),second=await analyze();
  const [a,b]=await Promise.all([
    executeAgentTool('nexus_validate_analysis',{analysis:first.result}),
    executeAgentTool('nexus_validate_analysis',{analysis:second.result})
  ]);
  assert.equal(a.fingerprint,b.fingerprint);
  assert.deepEqual(first.result.peaks,second.result.peaks);
  assert.deepEqual(first.result.nuclideCandidates,second.result.nuclideCandidates);
});

test('granular tools compose into validated bilingual report generation',async()=>{
  const qc=await executeAgentTool('nexus_quality_check',{spectrumText:syntheticDemo(),filename:'granular.csv'});
  const fit=await executeAgentTool('nexus_fit_energy_calibration',{calibrationText:calibration});
  const peaks=await executeAgentTool('nexus_find_peaks',{spectrumText:syntheticDemo(),filename:'granular.csv',calibrationText:calibration});
  const ranked=await executeAgentTool('nexus_rank_nuclide_candidates',{spectrumText:syntheticDemo(),filename:'granular.csv',calibrationText:calibration});
  const report=await executeAgentTool('nexus_generate_report',{spectrumText:syntheticDemo(),filename:'granular.csv',calibrationText:calibration,language:'en'});
  assert.equal(qc.qc.level,'pass');
  assert.equal(fit.calibration.pointCount,2);
  assert.equal(peaks.result.matching,null);
  assert.equal(ranked.nuclideCandidates.find(x=>x.nuclide==='Co-60').status,'supported');
  assert.equal(report.validation.valid,true);
  assert.match(report.html,/Analysis Report/);
});
