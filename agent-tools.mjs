import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Workspace} from './src/workflow.js';
import {explainCandidate} from './src/evidence-explanation.js';
import {normalizeSpectrumFile} from './file-import.mjs';
const db=JSON.parse(await readFile(new URL('./data/nuclear-lines.json',import.meta.url),'utf8'));
const peakSettings={type:'object',properties:{smoothingWindow:{type:'integer',minimum:1,maximum:101},minProminencePercent:{type:'number',exclusiveMinimum:0,maximum:100},minDistance:{type:'integer',minimum:1},detectionMode:{type:'string',enum:['adaptive','snip','global']},minSignificance:{type:'number',minimum:2,maximum:20},snipIterations:{type:'integer',minimum:1,maximum:200},fitOverlaps:{type:'boolean'}}};
export const agentTools=[
  {name:'nexus_import_spectrum',description:'把 CSV、TXT、DAT、SPE、XLS 或 XLSX 统一转换为可分析的 channel,counts 文本。文本格式用 fileText；Excel 用 fileBase64。',inputSchema:{type:'object',properties:{filename:{type:'string'},fileText:{type:'string'},fileBase64:{type:'string'}},required:['filename'],additionalProperties:false}},
  {name:'nexus_analyze_spectrum',description:'对 channel,counts 文本执行 QC、可选线性标定、寻峰、核素候选与证据分析。模型不得自行编造标定点。',inputSchema:{type:'object',properties:{spectrumText:{type:'string',description:'严格两列 channel,counts 的 UTF-8 文本'},filename:{type:'string'},calibrationText:{type:'string',description:'用户或实验提供的 channel,energy_keV 参考点；未知时省略'},settings:peakSettings,matchSettings:{type:'object',properties:{toleranceKeV:{type:'number',exclusiveMinimum:0},topN:{type:'integer',minimum:1,maximum:10}}}},required:['spectrumText'],additionalProperties:false}},
  {name:'nexus_query_gamma',description:'在版本固定、逐条标注数据资格的活动 γ 谱线集中查询用户明确给出的能量；结果只是数据库候选，不代表样品检出。',inputSchema:{type:'object',properties:{energyKeV:{type:'number',exclusiveMinimum:0},toleranceKeV:{type:'number',exclusiveMinimum:0},topN:{type:'integer',minimum:1,maximum:10}},required:['energyKeV'],additionalProperties:false}},
  {name:'nexus_generate_report',description:'对能谱执行与 nexus_analyze_spectrum 相同的分析，并返回独立 HTML 报告文本。',inputSchema:{type:'object',properties:{spectrumText:{type:'string'},filename:{type:'string'},calibrationText:{type:'string'},settings:peakSettings,matchSettings:{type:'object',properties:{toleranceKeV:{type:'number',exclusiveMinimum:0},topN:{type:'integer',minimum:1,maximum:10}}}},required:['spectrumText'],additionalProperties:false}}
];
function cleanArgs(args){if(!args||typeof args!=='object'||Array.isArray(args))throw new Error('工具参数必须是对象。');return args}
function summary(r){return {filename:r.source.filename,qc:r.qc.level,totalCounts:r.qc.summary.totalCounts,calibrated:Boolean(r.calibration),peakCount:r.peaks?.length??null,candidates:(r.matching||[]).map(m=>({peakId:m.peakId,energyKeV:m.measuredEnergyKeV,candidates:m.candidates.map(c=>({nuclide:c.nuclide,status:c.status,deltaKeV:c.deltaKeV,reason:explainCandidate(c,m.toleranceKeV,'zh'),sourceUrl:c.sourceUrl}))})),warnings:r.warnings};}
function analyze(args){args=cleanArgs(args);if(typeof args.spectrumText!=='string'||!args.spectrumText.trim())throw new Error('spectrumText 不能为空。');if(args.spectrumText.length>10_000_000)throw new Error('能谱文本超过 10 MB 限制。');const w=new Workspace(db);const hash=createHash('sha256').update(args.spectrumText,'utf8').digest('hex');w.load(args.spectrumText,args.filename||'agent-input.csv',hash);return w.analyze({calibrationText:args.calibrationText||'',settings:{...w.settings,...args.settings},matchSettings:{...w.matchSettings,...args.matchSettings}})}
export async function executeAgentTool(name,args={}){
  if(name==='nexus_import_spectrum'){args=cleanArgs(args);return normalizeSpectrumFile(args)}
  if(name==='nexus_query_gamma'){args=cleanArgs(args);const w=new Workspace(db);const rows=w.query(Number(args.energyKeV),args.toleranceKeV??2,args.topN??3);return {summary:`${args.energyKeV} keV 查询得到 ${rows.length} 条候选；不构成测量检出结论。`,query:{energyKeV:Number(args.energyKeV),rows},database:{datasetId:db.datasetId,scope:db.scope}}}
  if(name==='nexus_analyze_spectrum'){const result=analyze(args);return {summary:summary(result),result}}
  if(name==='nexus_generate_report'){const {htmlReport}=await import('./src/report.js');const result=analyze(args);return {summary:summary(result),filename:'Nexus-NAA-report.html',mediaType:'text/html',html:htmlReport(result)}}
  throw new Error(`未知工具：${name}`);
}
