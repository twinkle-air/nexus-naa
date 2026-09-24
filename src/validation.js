import {rankNuclideCandidates} from './core.js';
import {sha256Hex} from './sha256.js';

const CANDIDATE_STATUSES=new Set(['supported','tentative','conflicting','insufficient_evidence']);
const LINE_STATUSES=new Set(['observed','expected_but_not_observed','below_observability','outside_range','overlapped','not_assessable']);
const NUCLIDE_FIELDS=['status','score','matched_lines','companion_lines','contradictions','interferences','missing_information','data_sources','limitations','calibration_assessment'];
const FIELD_CODES={status:'STATUS',score:'SCORE',matched_lines:'MATCHED_LINES',companion_lines:'COMPANION_LINES',contradictions:'CONTRADICTIONS',interferences:'INTERFERENCES',missing_information:'MISSING_INFORMATION',data_sources:'DATA_SOURCES',limitations:'LIMITATIONS',calibration_assessment:'CALIBRATION_ASSESSMENT'};

export function stableJson(value){
  if(Array.isArray(value))return `[${value.map(stableJson).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stableJson(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function analysisFingerprint(result){
  const text=stableJson({schemaVersion:result?.schemaVersion,skillContractVersion:result?.skillContractVersion,softwareVersion:result?.softwareVersion,source:result?.source,spectrum:result?.spectrum,qc:result?.qc,calibration:result?.calibration,peakSearch:result?.peakSearch,matchSettings:result?.matchSettings,peaks:result?.peaks,matching:result?.matching,nuclideCandidates:result?.nuclideCandidates,evidence:result?.evidence,database:result?.database,warnings:result?.warnings});
  return `sha256-${sha256Hex(text)}`;
}

export function rebuildNuclideCandidates(result,referenceDatabase=null){
  if(result?.matching===null)return null;
  if(!Array.isArray(result?.matching))return [];
  const sources=referenceDatabase?.sources??result?.database?.sources??{};
  return rankNuclideCandidates(result.matching,{sources},result.calibration??null);
}

function compareNuclideEvidence(result,expected,fail){
  if(expected===null){if(result.nuclideCandidates!==null)fail('NUCLIDE_CANDIDATES_UNEXPECTED','未执行匹配时核素候选必须为 null。');return}
  if(!Array.isArray(result.nuclideCandidates)){fail('NUCLIDE_CANDIDATES_INVALID','核素候选必须是数组。');return}
  const actualByName=new Map(result.nuclideCandidates.map(x=>[x.nuclide,x])),expectedByName=new Map(expected.map(x=>[x.nuclide,x]));
  for(const name of actualByName.keys())if(!expectedByName.has(name))fail('NUCLIDE_UNEXPECTED',`核素级结果包含谱线级结果未生成的候选 ${name}。`);
  for(const [name,wanted] of expectedByName){const actual=actualByName.get(name);if(!actual){fail('NUCLIDE_MISSING',`缺少应由谱线级结果生成的候选 ${name}。`);continue}for(const field of NUCLIDE_FIELDS)if(stableJson(actual[field])!==stableJson(wanted[field]))fail(`NUCLIDE_${FIELD_CODES[field]}_MISMATCH`,`${name} 的 ${field} 未由谱线级结果规范生成。`)}
  if(stableJson(result.nuclideCandidates.map(x=>x.nuclide))!==stableJson(expected.map(x=>x.nuclide)))fail('NUCLIDE_ORDER_MISMATCH','核素候选顺序不符合确定性排序。');
}

export function validateAnalysis(result,referenceDatabase=null){
  const errors=[],warnings=[],checks=[];const pass=(code,detail)=>checks.push({code,status:'pass',detail});const fail=(code,detail)=>{errors.push({code,message:detail});checks.push({code,status:'fail',detail})};const warn=(code,detail)=>{warnings.push({code,message:detail});checks.push({code,status:'warning',detail})};
  if(!result||typeof result!=='object'){fail('INVALID_RESULT','分析结果必须是对象。');return {valid:false,errors,warnings,checks,fingerprint:null,validatedAt:new Date().toISOString(),validatorVersion:'1.3.0'}}
  if(!result.source?.filename)fail('SOURCE_MISSING','缺少输入文件名。');else pass('SOURCE_PRESENT',result.source.filename);
  if(result.source?.sha256==null)warn('SOURCE_HASH_MISSING','缺少输入字节 SHA-256；结果可供交互查看，但不能作为完整可追溯报告。');else if(!/^[a-f0-9]{64}$/i.test(result.source.sha256))fail('SOURCE_HASH_INVALID','输入 SHA-256 格式无效。');else pass('SOURCE_HASH_VALID','输入哈希格式有效。');
  if(!result.qc?.level)fail('QC_MISSING','缺少 QC 结果。');else pass('QC_PRESENT',result.qc.level);
  if(referenceDatabase&&result.database?.datasetId!==referenceDatabase.datasetId)fail('DATABASE_SNAPSHOT_MISMATCH','分析结果引用的核数据库快照与验证器固定快照不一致。');
  const peaks=result.peaks;const peakMap=new Map();if(peaks!==null&&!Array.isArray(peaks))fail('PEAK_TABLE_INVALID','峰表必须是数组或 null。');else if(Array.isArray(peaks)){for(const peak of peaks){if(!Number.isInteger(peak.id)||peak.id<1||peakMap.has(peak.id))fail('PEAK_ID_INVALID','峰 ID 必须是唯一正整数。');else peakMap.set(peak.id,peak)}pass('PEAK_TABLE_PRESENT',`${peaks.length} peaks`)}
  const evidenceRows=result.evidence?.evidence||[],evidenceMap=new Map();for(const row of evidenceRows){if(!row.id||evidenceMap.has(row.id))fail('EVIDENCE_ID_INVALID','证据 ID 必须存在且唯一。');else evidenceMap.set(row.id,row)}for(const row of evidenceRows)for(const dependency of row.dependsOn||[])if(!evidenceMap.has(dependency))fail('EVIDENCE_DEPENDENCY_MISSING',`证据 ${row.id} 引用了不存在的依赖 ${dependency}。`);
  const candidateByEvidence=new Map();
  if(result.matching!==null){if(!Array.isArray(result.matching))fail('MATCHING_INVALID','候选匹配必须是数组或 null。');else for(const match of result.matching){const peak=peakMap.get(match.peakId);if(!peak)fail('MATCH_PEAK_MISSING',`候选引用不存在的峰 ${match.peakId}。`);else if(Math.abs((peak.energyKeV??NaN)-match.measuredEnergyKeV)>1e-6)fail('MATCH_ENERGY_MISMATCH',`峰 ${match.peakId} 的匹配能量与峰表不一致。`);for(const candidate of match.candidates||[]){candidateByEvidence.set(candidate.evidenceId,{candidate,match});if(!CANDIDATE_STATUSES.has(candidate.status))fail('CANDIDATE_STATUS_INVALID',`${candidate.nuclide} 的状态无效。`);if(candidate.status==='supported'&&candidate.calibrationUse!=='within_reference_range')fail('SUPPORTED_EXTRAPOLATION',`${candidate.nuclide} 位于标定外推区却被标为 supported。`);if(candidate.status==='supported'&&candidate.mode==='annihilation')fail('SUPPORTED_ANNIHILATION','511 keV 湮没线不能单独形成 supported 结论。');if(candidate.status==='supported'&&candidate.supportEligible!==true)fail('SUPPORTED_LINE_INELIGIBLE',`${candidate.nuclide} 的谱线不具备支持资格却被标为 supported。`);const ev=evidenceMap.get(candidate.evidenceId);if(!ev)fail('CANDIDATE_EVIDENCE_MISSING',`${candidate.nuclide} 缺少证据 ${candidate.evidenceId}。`);else if(ev.nuclide!==candidate.nuclide||ev.recordId!==candidate.id||Math.abs(ev.deltaKeV-candidate.deltaKeV)>1e-9||ev.supportEligible!==candidate.supportEligible||ev.supportWindowKeV!==candidate.supportWindowKeV||ev.independenceStatus!==candidate.independenceStatus||stableJson(ev.supportExclusionReasons)!==stableJson(candidate.supportExclusionReasons))fail('CANDIDATE_EVIDENCE_MISMATCH',`${candidate.nuclide} 的数值、支持资格或记录与证据链不一致。`);const trustedSource=referenceDatabase?.sources?.[candidate.sourceId]??result.database?.sources?.[candidate.sourceId],trustedUrl=databaseLineUrl(referenceDatabase,candidate);if(!trustedSource||!candidate.sourceUrl||(trustedUrl&&candidate.sourceUrl!==trustedUrl))fail('CANDIDATE_SOURCE_MISSING',`${candidate.nuclide} 缺少或改变了核数据来源 ${candidate.sourceId}。`);for(const companion of candidate.companions||[])if(!LINE_STATUSES.has(companion.status))fail('LINE_STATUS_INVALID',`${candidate.nuclide} 的伴随线状态无效。`)}}}
  if(result.evidence){for(const claim of result.evidence.claims||[]){for(const id of claim.evidenceIds||[])if(!evidenceMap.has(id))fail('CLAIM_EVIDENCE_MISSING',`声明 ${claim.id} 引用了不存在的证据 ${id}。`);const linked=(claim.evidenceIds||[]).map(id=>candidateByEvidence.get(id)).find(Boolean);if(!linked||claim.level!==linked.candidate.status||claim.statement!==`峰 ${linked.match.peakId} 与 ${linked.candidate.nuclide} 的 ${linked.candidate.energyKeV} keV 线相容`)fail('CLAIM_CONTENT_MISMATCH',`声明 ${claim.id} 的内容或等级不来自候选工具结果。`)}const sourceEvidence=evidenceRows.find(x=>x.type==='measured_spectrum');if(sourceEvidence&&sourceEvidence.sha256!==result.source?.sha256)fail('EVIDENCE_HASH_MISMATCH','证据链与分析结果的输入哈希不一致。');else if(sourceEvidence)pass('EVIDENCE_HASH_MATCH','证据链与结果引用同一输入。')}
  compareNuclideEvidence(result,rebuildNuclideCandidates(result,referenceDatabase),fail);
  for(const candidate of result.nuclideCandidates||[]){for(const line of candidate.matched_lines||[])if(!evidenceMap.has(line.evidence_id))fail('NUCLIDE_EVIDENCE_MISSING',`${candidate.nuclide} 引用了不存在的证据 ${line.evidence_id}。`);for(const line of candidate.companion_lines||[])if(!evidenceMap.has(line.evidence_id))fail('COMPANION_EVIDENCE_MISSING',`${candidate.nuclide} 的伴随线检查引用了不存在的证据 ${line.evidence_id}。`)}
  if(result.calibration?.pointCount===2&&!result.warnings?.some(x=>x.includes('两点')))fail('TWO_POINT_WARNING_MISSING','两点标定必须保留无法独立验证准确性的警告。');
  if((result.matching||[]).some(x=>x.calibrationUse==='extrapolated')&&!result.warnings?.some(x=>x.includes('外推')))fail('EXTRAPOLATION_WARNING_MISSING','存在标定外推，但报告警告未保留。');
  if(!errors.length)pass('TRACEABILITY_COMPLETE','候选、说明字段、数值、来源和证据引用均由规范化结果生成。');
  return {valid:errors.length===0,errors,warnings,checks,fingerprint:analysisFingerprint(result),validatedAt:new Date().toISOString(),validatorVersion:'1.3.0'};
}

function databaseLineUrl(database,candidate){return database?.lines?.find(x=>x.id===candidate.id)?.sourceUrl??null}

export function assertValidAnalysis(result,referenceDatabase=null){const validation=validateAnalysis(result,referenceDatabase);if(!validation.valid){const error=new Error(`分析一致性验证失败：${validation.errors.map(x=>x.code).join(', ')}`);error.code='ANALYSIS_VALIDATION_FAILED';error.validation=validation;throw error}return validation}
