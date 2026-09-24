import {readFile} from 'node:fs/promises';
import {importSpreadsheet} from '../file-import.mjs';
import {applyCalibration,findPeaks,matchPeakCandidates,parseSpectrum,queryGammaLines,rankNuclideCandidates,suggestCalibrationPoints} from '../src/core.js';

const database=JSON.parse(await readFile(new URL('../data/nuclear-lines.json',import.meta.url),'utf8'));
const evaluationPlan=JSON.parse(await readFile(new URL('../tests/fixtures/identification-evaluation-cases.json',import.meta.url),'utf8'));
const policy=JSON.parse(await readFile(new URL('../tests/fixtures/identification-quality-policy.json',import.meta.url),'utf8'));
const cases=evaluationPlan.cases;
const tolerances=[0.5,1,2,3],statusRank={supported:4,tentative:3,conflicting:2,insufficient_evidence:1};

function nearestBaseline(peaks,tolerance){
  const groups=new Map();let unexplainedPeakCount=0;
  for(const peak of peaks){const hit=queryGammaLines(database,peak.energyKeV,tolerance,1)[0];if(!hit){unexplainedPeakCount++;continue}const row=groups.get(hit.nuclide)??{nuclide:hit.nuclide,hits:0,totalAbsDelta:0,status:'tentative',observedLineCount:0};row.hits++;row.observedLineCount++;row.totalAbsDelta+=hit.absDeltaKeV;groups.set(hit.nuclide,row)}
  const ranked=[...groups.values()].sort((a,b)=>b.hits-a.hits||a.totalAbsDelta-b.totalAbsDelta||a.nuclide.localeCompare(b.nuclide));
  if(ranked[0])ranked[0].status='supported';
  return {ranked,unexplainedPeakCount};
}

function lineCompanionBaseline(matches){
  const groups=new Map();
  for(const match of matches)for(const candidate of match.candidates){const row=groups.get(candidate.nuclide)??{nuclide:candidate.nuclide,status:'insufficient_evidence',score:0,lineIds:new Set(),companionIds:new Set()},foundCount=(candidate.companions||[]).filter(companion=>companion.foundPeakId).length,energyScore=Math.max(0,1-Math.abs(candidate.deltaKeV)/match.toleranceKeV);let legacyStatus='insufficient_evidence';if(foundCount>0&&energyScore>=.75)legacyStatus='supported';else if(energyScore>=.75||foundCount>0)legacyStatus='tentative';else if(energyScore<.35)legacyStatus='conflicting';if(candidate.mode==='annihilation'||candidate.calibrationUse==='extrapolated')legacyStatus='insufficient_evidence';row.lineIds.add(candidate.id);for(const companion of candidate.companions||[])if(companion.foundPeakId)row.companionIds.add(companion.lineId);if(statusRank[legacyStatus]>statusRank[row.status])row.status=legacyStatus;row.score=Math.max(row.score,candidate.score);groups.set(candidate.nuclide,row)}
  return [...groups.values()].map(row=>({nuclide:row.nuclide,status:row.status,score:row.score,observedLineCount:new Set([...row.lineIds,...row.companionIds]).size})).sort((a,b)=>statusRank[b.status]-statusRank[a.status]||b.score-a.score||a.nuclide.localeCompare(b.nuclide));
}

function fullRows(matches,calibration){return rankNuclideCandidates(matches,database,calibration).map(row=>{const observations=new Map();for(const line of row.matched_lines)if(line.support_eligible)observations.set(line.peak_id,line.reference_line_id);for(const line of row.companion_lines)if(line.supportEligible&&line.foundPeakId!==null&&!observations.has(line.foundPeakId))observations.set(line.foundPeakId,line.lineId);return {nuclide:row.nuclide,status:row.status,score:row.score,observedLineCount:observations.size,usesExtrapolation:row.calibration_assessment.uses_extrapolation,supportExclusionReasons:[...new Set([...row.matched_lines.flatMap(x=>x.support_exclusion_reasons),...row.companion_lines.flatMap(x=>x.supportExclusionReasons)])]}})}

function referenceLineAudit(matches,calibration,expected){return rankNuclideCandidates(matches,database,calibration).filter(row=>expected.includes(row.nuclide)).map(row=>({nuclide:row.nuclide,status:row.status,lines:row.matched_lines.map(line=>({peakId:line.peak_id,observedEnergyKeV:line.observed_energy_keV,referenceEnergyKeV:line.reference_energy_keV,residualKeV:line.residual_keV,supportWindowKeV:line.support_window_keV,supportEligible:line.support_eligible,exclusionReasons:line.support_exclusion_reasons}))}))}

function metrics(ranked,expected,unexplainedPeakCount,peakCount){
  const expectedSet=new Set(expected),top3=ranked.slice(0,3),supported=ranked.filter(row=>row.status==='supported');
  return {
    top1Correct:Boolean(ranked[0]&&expectedSet.has(ranked[0].nuclide)),
    top3Recall:expected.filter(nuclide=>top3.some(row=>row.nuclide===nuclide)).length/expected.length,
    correctRetainedRate:expected.filter(nuclide=>ranked.some(row=>row.nuclide===nuclide&&!['conflicting','insufficient_evidence'].includes(row.status))).length/expected.length,
    nonReferenceSupportedCount:supported.filter(row=>!expectedSet.has(row.nuclide)).length,
    unsupportedDefinitiveCount:supported.filter(row=>(row.observedLineCount??0)<2||row.usesExtrapolation===true).length,
    unexplainedPeakCount,
    unexplainedPeakRate:peakCount?unexplainedPeakCount/peakCount:0,
    top3:top3.map(row=>({nuclide:row.nuclide,status:row.status,score:row.score??null,observedLineCount:row.observedLineCount??null,...(row.supportExclusionReasons?{supportExclusionReasons:row.supportExclusionReasons}:{})})),
    nonReferenceReviewCandidates:ranked.filter(row=>!expectedSet.has(row.nuclide)).map(row=>({nuclide:row.nuclide,status:row.status,score:row.score??null,observedLineCount:row.observedLineCount??null,...(row.supportExclusionReasons?{supportExclusionReasons:row.supportExclusionReasons}:{})}))
  };
}

const evaluations=[];
for(const testCase of cases){
  const bytes=await readFile(new URL(`../data/reference-spectra/${testCase.filename}`,import.meta.url)),converted=await importSpreadsheet(bytes,testCase.filename),spectrum=parseSpectrum(converted.spectrumText,testCase.filename);
  const adaptive=findPeaks(spectrum,{smoothingWindow:5,minDistance:8,detectionMode:'adaptive',minSignificance:4,minProminencePercent:5,snipIterations:24}),calibration=suggestCalibrationPoints(adaptive,database,testCase.calibrationNuclide).calibration;
  const peaks=applyCalibration(findPeaks(spectrum,{smoothingWindow:5,minDistance:8,detectionMode:'snip',minSignificance:8,minProminencePercent:5,snipIterations:24,fitOverlaps:true}),calibration),energyRange=[Math.min(...peaks.map(x=>x.energyKeV)),Math.max(...peaks.map(x=>x.energyKeV))];
  for(const toleranceKeV of tolerances){
    const nearest=nearestBaseline(peaks,toleranceKeV),matches=matchPeakCandidates(peaks,database,{toleranceKeV,topN:3,calibrationRangeKeV:calibration.referenceRangeKeV,calibrationRmseKeV:calibration.rmse,energyRange}),unexplained=matches.filter(match=>match.candidates.length===0).length;
    evaluations.push({filename:testCase.filename,expected:testCase.expected,calibrationNuclide:testCase.calibrationNuclide,calibrationMode:testCase.calibrationMode,sampleClass:testCase.sampleClass,truthQualification:testCase.truthQualification,accuracyEligible:testCase.accuracyEligible,calibrationStatus:calibration.validationStatus,toleranceKeV,peakCount:peaks.length,referenceLineAudit:referenceLineAudit(matches,calibration,testCase.expected),systems:{nearest_energy:metrics(nearest.ranked,testCase.expected,nearest.unexplainedPeakCount,peaks.length),line_companion:metrics(lineCompanionBaseline(matches),testCase.expected,unexplained,peaks.length),full_evidence:metrics(fullRows(matches,calibration),testCase.expected,unexplained,peaks.length)}});
  }
}

function aggregate(system){const rows=evaluations.map(row=>row.systems[system]),mean=key=>rows.reduce((sum,row)=>sum+Number(row[key]),0)/rows.length;return {evaluations:rows.length,top1ReferenceRetentionRate:mean('top1Correct'),meanTop3ReferenceRecall:mean('top3Recall'),meanCorrectRetainedRate:mean('correctRetainedRate'),nonReferenceSupportedCount:rows.reduce((sum,row)=>sum+row.nonReferenceSupportedCount,0),unsupportedDefinitiveCount:rows.reduce((sum,row)=>sum+row.unsupportedDefinitiveCount,0),meanUnexplainedPeakRate:mean('unexplainedPeakRate')}}
const aggregateResults={nearest_energy:aggregate('nearest_energy'),line_companion:aggregate('line_companion'),full_evidence:aggregate('full_evidence')},target=aggregateResults[policy.system],thresholds=policy.thresholds;
const checks=[
  {metric:'nonReferenceSupportedCount',actual:target.nonReferenceSupportedCount,operator:'<=',threshold:thresholds.maxNonReferenceSupportedCount,passed:target.nonReferenceSupportedCount<=thresholds.maxNonReferenceSupportedCount},
  {metric:'unsupportedDefinitiveCount',actual:target.unsupportedDefinitiveCount,operator:'<=',threshold:thresholds.maxUnsupportedDefinitiveCount,passed:target.unsupportedDefinitiveCount<=thresholds.maxUnsupportedDefinitiveCount},
  {metric:'top1ReferenceRetentionRate',actual:target.top1ReferenceRetentionRate,operator:'>=',threshold:thresholds.minTop1ReferenceRetentionRate,passed:target.top1ReferenceRetentionRate>=thresholds.minTop1ReferenceRetentionRate},
  {metric:'meanTop3ReferenceRecall',actual:target.meanTop3ReferenceRecall,operator:'>=',threshold:thresholds.minMeanTop3ReferenceRecall,passed:target.meanTop3ReferenceRecall>=thresholds.minMeanTop3ReferenceRecall}
];
const output={schemaVersion:'1.1',generatedAt:new Date().toISOString(),method:{peakSearch:'SNIP LLS, 8 sigma, smoothing 5, minDistance 8',calibration:'label-assisted known-standard calibration; not a blind identification test and not an accuracy estimate',supportWindow:'min(candidate tolerance, FWHM/2 + calibration RMSE); project engineering rule pending broader independent validation',tolerancesKeV:tolerances,systems:{nearest_energy:'one nearest database line per peak; highest-hit nuclide treated as the baseline assertion',line_companion:'legacy broad-tolerance energy and observed-companion rules, retained as a comparison baseline',full_evidence:'canonical nuclide evidence plus support eligibility, independence, calibration range and stop rules'}},datasetQualification:{caseCount:cases.length,accuracyEligibleCaseCount:cases.filter(x=>x.accuracyEligible).length,coverageGaps:evaluationPlan.coverageGaps,warning:'All current cases use label-assisted calibration; rates are fixed-suite regression retention metrics, not blind-identification accuracy.'},qualityGate:{policy,passed:checks.every(x=>x.passed),checks},aggregate:aggregateResults,evaluations};
console.log(JSON.stringify(output,null,2));
if(!output.qualityGate.passed)process.exitCode=1;
