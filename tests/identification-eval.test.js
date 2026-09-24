import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

test('three-system identification evaluation runs on all spectra and tolerances',async()=>{
  const child=spawn(process.execPath,['scripts/evaluate-identification.mjs'],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);
  await new Promise((resolve,reject)=>{child.on('exit',code=>code===0?resolve():reject(new Error(stderr||`exit ${code}`)));child.on('error',reject)});
  const result=JSON.parse(stdout);
  assert.equal(result.evaluations.length,12);
  assert.deepEqual(Object.keys(result.aggregate),['nearest_energy','line_companion','full_evidence']);
  assert.match(result.method.calibration,/not a blind identification test/);
  assert.equal(result.datasetQualification.accuracyEligibleCaseCount,0);
  assert.ok(result.datasetQualification.coverageGaps.includes('blank_spectrum'));
  for(const system of Object.values(result.aggregate)){assert.equal(system.evaluations,12);for(const key of ['top1ReferenceRetentionRate','meanTop3ReferenceRecall','meanCorrectRetainedRate','meanUnexplainedPeakRate'])assert.ok(system[key]>=0&&system[key]<=1,key)}
  assert.equal(result.aggregate.full_evidence.unsupportedDefinitiveCount,0);
  assert.equal(result.aggregate.line_companion.nonReferenceSupportedCount,2);
  assert.equal(result.aggregate.full_evidence.nonReferenceSupportedCount,0);
  assert.equal(result.qualityGate.passed,true);
  for(const toleranceKeV of [2,3]){const eu=result.evaluations.find(row=>row.filename==='Eu-152.xls'&&row.toleranceKeV===toleranceKeV),eu154=eu.systems.full_evidence.nonReferenceReviewCandidates.find(row=>row.nuclide==='Eu-154');assert.ok(eu154,`Eu-154 candidate retained at ${toleranceKeV} keV`);assert.notEqual(eu154.status,'supported');assert.ok(eu154.supportExclusionReasons.length>0)}
  for(const toleranceKeV of [2,3]){const mixed=result.evaluations.find(row=>row.filename==='Ba-133_Cs-137.xls'&&row.toleranceKeV===toleranceKeV),ba=mixed.referenceLineAudit.find(row=>row.nuclide==='Ba-133');assert.equal(ba.status,'supported');assert.equal(ba.lines.filter(line=>line.supportEligible).length,3);assert.deepEqual(ba.lines.find(line=>Math.abs(line.referenceEnergyKeV-383.8485)<.001)?.exclusionReasons,['UNRESOLVED_PEAK_ARTIFACT'])}
});
