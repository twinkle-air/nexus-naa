import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Workspace} from './src/workflow.js';
import {parseSpectrum,qcSpectrum,fitLinearCalibration,parseCalibrationPoints} from './src/core.js';
import {explainCandidate} from './src/evidence-explanation.js';
import {validateAnalysis,assertValidAnalysis} from './src/validation.js';
import {normalizeSpectrumFile} from './file-import.mjs';
import {toolSchemas,validateToolInput,validateToolOutput} from './contracts.mjs';

const db=JSON.parse(await readFile(new URL('./data/nuclear-lines.json',import.meta.url),'utf8'));
const descriptions={
  nexus_import_spectrum:'统一导入 CSV、TXT、DAT、SPE、XLS 或 XLSX。只做格式归一化，不进行科学判断。',
  nexus_quality_check:'检查标准化 channel,counts 谱的通道连续性、计数有效性和基础统计。QC 阻断时不得继续寻峰。',
  nexus_fit_energy_calibration:'仅使用用户、仪器或实验标准提供的参考点拟合线性能量标定；两点拟合标记为未独立验证。',
  nexus_find_peaks:'对通过 QC 的连续通道谱执行确定性寻峰；返回峰表，不自行识别核素。',
  nexus_query_gamma:'查询用户明确给出的单个能量。结果只是固定核数据库候选，不是样品检出结论。',
  nexus_rank_nuclide_candidates:'对已标定谱形成核素级证据，同时保留谱线一致性等级和独立标定质量。',
  nexus_analyze_spectrum:'兼容入口：执行 QC、可选标定、寻峰和可选候选排序。',
  nexus_validate_analysis:'从声明的输入谱和标定参考点复算派生结果，按固定数据库记录核对数值、来源、残差及支持资格；不认证原始测量真实性。',
  nexus_generate_report:'便捷入口：重新执行分析、验证并生成报告。需要报告既有快照时不要使用本工具。',
  nexus_generate_report_from_analysis:'首选报告入口：验证传入的同一份分析快照，并仅对该快照生成报告。'
};
export const agentTools=Object.entries(descriptions).map(([name,description])=>({name,description,...toolSchemas(name)}));

function cleanArgs(args){if(!args||typeof args!=='object'||Array.isArray(args))throw Object.assign(new Error('工具参数必须是对象。'),{code:'INVALID_TOOL_ARGUMENTS'});return args}
function requireSpectrumText(args){if(typeof args.spectrumText!=='string'||!args.spectrumText.trim())throw Object.assign(new Error('spectrumText 不能为空。'),{code:'EMPTY_SPECTRUM_TEXT'});if(args.spectrumText.length>10_000_000)throw Object.assign(new Error('能谱文本超过 10 MB 限制。'),{code:'SPECTRUM_TOO_LARGE'});}
function textHash(text){return createHash('sha256').update(text,'utf8').digest('hex')}
function loadWorkspace(args){requireSpectrumText(args);const w=new Workspace(db);w.load(args.spectrumText,args.filename||'agent-input.csv',textHash(args.spectrumText));return w}
function runAnalysis(args){args=cleanArgs(args);const w=loadWorkspace(args);return w.analyze({calibrationText:args.calibrationText||'',settings:{...w.settings,...args.settings},matchSettings:{...w.matchSettings,...args.matchSettings}})}
function summary(r){return {filename:r.source.filename,qc:r.qc.level,totalCounts:r.qc.summary.totalCounts,calibrated:Boolean(r.calibration),calibrationStatus:r.calibration?.validationStatus??null,peakCount:r.peaks?.length??null,nuclideCandidates:r.nuclideCandidates??[],candidates:(r.matching||[]).map(m=>({peakId:m.peakId,energyKeV:m.measuredEnergyKeV,calibrationUse:m.calibrationUse,candidates:m.candidates.map(c=>({nuclide:c.nuclide,status:c.status,deltaKeV:c.deltaKeV,evidenceId:c.evidenceId,reason:explainCandidate(c,m.toleranceKeV,'zh'),sourceUrl:c.sourceUrl}))})),warnings:r.warnings};}

async function executeUnchecked(name,args){
  if(name==='nexus_import_spectrum')return normalizeSpectrumFile(args);
  if(name==='nexus_quality_check'){requireSpectrumText(args);const spectrum=parseSpectrum(args.spectrumText,args.filename||'agent-input.csv');spectrum.sha256=textHash(args.spectrumText);return {spectrum:{filename:spectrum.filename,format:spectrum.format,sha256:spectrum.sha256},qc:qcSpectrum(spectrum),blocking:spectrum.warnings.some(x=>x.includes('非连续通道'))?['DISCONTINUOUS_CHANNELS']:[]}}
  if(name==='nexus_fit_energy_calibration'){const calibration=fitLinearCalibration(parseCalibrationPoints(String(args.calibrationText||'')));return {calibration,warnings:calibration.warnings}}
  if(name==='nexus_find_peaks'){const w=loadWorkspace(args);if(String(args.calibrationText||'').trim())w.calibrate(args.calibrationText);w.search({...w.settings,...args.settings});const result=w.snapshot();return {summary:summary(result),result}}
  if(name==='nexus_query_gamma'){const w=new Workspace(db),rows=w.query(Number(args.energyKeV),args.toleranceKeV??2,args.topN??3);return {summary:`${args.energyKeV} keV 查询得到 ${rows.length} 条数据库候选；不构成测量检出结论。`,query:{energyKeV:Number(args.energyKeV),toleranceKeV:args.toleranceKeV??2,rows},database:{datasetId:db.datasetId,scope:db.scope}}}
  if(name==='nexus_rank_nuclide_candidates'){if(!String(args.calibrationText||'').trim())throw Object.assign(new Error('核素候选排序需要可靠参考点标定；无标定时只能寻峰。'),{code:'CALIBRATION_REQUIRED'});const result=runAnalysis(args);return {summary:summary(result),nuclideCandidates:result.nuclideCandidates,result}}
  if(name==='nexus_analyze_spectrum'){const result=runAnalysis(args);return {summary:summary(result),result}}
  if(name==='nexus_validate_analysis')return validateAnalysis(args.analysis,db);
  if(name==='nexus_generate_report'){const {htmlReport}=await import('./src/report.js'),result=runAnalysis(args),validation=assertValidAnalysis(result,db);return {summary:summary(result),validation,analysisFingerprint:validation.fingerprint,filename:`Nexus-NAA-report-${validation.fingerprint}.html`,mediaType:'text/html',html:htmlReport(result,args.language||'zh',db)}}
  if(name==='nexus_generate_report_from_analysis'){const {htmlReport}=await import('./src/report.js'),result=structuredClone(args.analysis),validation=assertValidAnalysis(result,db);return {summary:summary(result),validation,analysisFingerprint:validation.fingerprint,filename:`Nexus-NAA-report-${validation.fingerprint}.html`,mediaType:'text/html',html:htmlReport(result,args.language||'zh',db)}}
  throw Object.assign(new Error(`未知工具：${name}`),{code:'UNKNOWN_TOOL'});
}

// Do not expose mutable references to the trusted database through query results.
export async function executeAgentTool(name,args={}){args=cleanArgs(args);validateToolInput(name,args);return structuredClone(validateToolOutput(name,await executeUnchecked(name,args)))}
