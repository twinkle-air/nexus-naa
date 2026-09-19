import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Workspace} from '../src/workflow.js';
import {offlinePlan,executePlan,manualPrompt,parseModelPlan,validatePlanForPrompt} from '../src/assistant.js';
import {htmlReport} from '../src/report.js';
import {modelPlan} from '../model.mjs';
import {parseSpectrum,parseCalibrationPoints,fitLinearCalibration,matchPeakCandidates} from '../src/core.js';
const db=JSON.parse(await readFile(new URL('../data/nuclear-lines.json',import.meta.url),'utf8'));
const spectrum=Array.from({length:1600},(_,i)=>`${i},${5+1000*Math.exp(-.5*((i-1173.228)/3)**2)+1000*Math.exp(-.5*((i-1332.492)/3)**2)}`).join('\n');
function ws(){const w=new Workspace(db);w.load(spectrum,'synthetic-Co60.csv','test-hash');return w;}
test('assistant end-to-end shares snapshot with report and evidence',()=>{const w=ws();const out=executePlan(offlinePlan('分析这张谱'),w,{calibrationText:'0,0\n1500,1500'});assert.equal(out.result.peaks.length,2);assert.ok(out.result.matching.every(m=>m.candidates.some(c=>c.nuclide==='Co-60'&&c.status==='supported')));const report=htmlReport(out.result);assert.ok(report.includes('test-hash'));assert.ok(report.includes('Co-60'));assert.ok(report.includes('<svg'));assert.deepEqual(w.spectrum.counts,parseSpectrum(spectrum).counts);});
test('un calibrated analysis stops before matching',()=>{const out=executePlan(offlinePlan('分析这张谱'),ws());assert.equal(out.result.matching,null);assert.match(out.text,/缺少标定/);});
test('failed re-import clears old analysis',()=>{const w=ws();w.analyze({calibrationText:'0,0\n1500,1500'});assert.throws(()=>w.load('bad','bad.csv'));assert.equal(w.spectrum,null);assert.equal(w.calibration,null);assert.equal(w.matches,null);});
test('failed calibration invalidates previous energies',()=>{const w=ws();w.analyze({calibrationText:'0,0\n1500,1500'});assert.throws(()=>w.calibrate('0,0'));assert.equal(w.calibration,null);assert.ok(w.peaks.every(p=>p.energyKeV===null));assert.equal(w.matches,null);});
test('zero peaks still exports a complete report',()=>{const w=new Workspace(db);w.load('0,0\n1,0\n2,0','empty-counts.csv');w.analyze();assert.equal(w.snapshot().peaks.length,0);assert.match(htmlReport(w.snapshot()),/共 0 个峰/);});
test('no database does not hallucinate candidates',()=>{const w=ws();w.database=null;w.analyze({calibrationText:'0,0\n1500,1500'});assert.equal(w.matches,null);assert.throws(()=>w.match(),/数据库/);});
test('standalone query works without spectrum',()=>assert.match(executePlan(offlinePlan('661.657 keV 可能是什么'),new Workspace(db)).text,/Cs-137/));
test('assistant can explicitly match already calibrated peaks',()=>{const w=ws();w.calibrate('0,0\n1500,1500');w.search();const out=executePlan(offlinePlan('匹配核素候选'),w,{matchSettings:{toleranceKeV:2,topN:3}});assert.equal(offlinePlan('匹配核素候选').action,'match');assert.ok(out.result.matching.every(m=>m.candidates.some(c=>c.nuclide==='Co-60')))});
test('report escapes filename injection',()=>{const w=ws();w.spectrum.filename='<script>alert(1)</script>';assert.ok(!htmlReport(w.snapshot()).includes('<script>'));});
test('English report localizes human-facing report labels',()=>{const report=htmlReport(ws().snapshot(),'en');assert.match(report,/Analysis Report/);assert.match(report,/Peak table/);assert.doesNotMatch(report,/分析报告/)});
test('saved analysis restores spectrum and derived results',()=>{const original=ws();original.analyze({calibrationText:'0,0\n1500,1500'});const restored=new Workspace(db);restored.restore(original.snapshot());assert.equal(restored.spectrum.counts.length,1600);assert.equal(restored.peaks.length,2);assert.equal(restored.matches.length,2);assert.equal(restored.trace.at(-1).tool,'restore_analysis')});
test('V1.0 release metadata preserves 0.4 snapshot compatibility',()=>{const original=ws();const current=original.snapshot();assert.equal(current.softwareVersion,'1.0.0');assert.equal(current.schemaVersion,'0.4');assert.match(htmlReport(current),/V1\.0/);const old={...current,softwareVersion:'0.4.0'};const restored=new Workspace(db);restored.restore(old);assert.equal(restored.snapshot().softwareVersion,'1.0.0');assert.equal(restored.spectrum.counts.length,original.spectrum.counts.length)});
test('report presents human-readable candidate reasons',()=>{const w=ws();const report=htmlReport(w.analyze({calibrationText:'0,0\n1500,1500'}));assert.match(report,/核素候选与判定理由/);assert.match(report,/观察到 1\/1 条伴随线/)});
test('scientific notation is data, unknown header is rejected',()=>{assert.deepEqual(parseSpectrum('0,1e2\n1,2e2').counts,[100,200]);assert.throws(()=>parseSpectrum('energy,counts\n1,2'));assert.throws(()=>parseCalibrationPoints('0,0\nxx,2\n4,5'));assert.throws(()=>fitLinearCalibration([{channel:0,energyKeV:2},{channel:1,energyKeV:1}]));});
test('one peak cannot support itself as a companion',()=>{const d={sources:{S:{}},lines:[{nuclide:'X',energyKeV:100,intensityPercent:90,sourceId:'S'},{nuclide:'X',energyKeV:101,intensityPercent:80,sourceId:'S'}]};assert.ok(matchPeakCandidates([{id:1,energyKeV:100.5}],d,{toleranceKeV:2}).every(m=>m.candidates.every(c=>c.status!=='supported')));});
test('Ollama response validated through same allowed tool contract (mock)',async()=>{let request;const fetcher=async(url,opts)=>{request=JSON.parse(opts.body);return {ok:true,json:async()=>({message:{content:'{"action":"analyze"}'}})};};const out=await modelPlan('请分析','local-test','ollama',fetcher,{});assert.equal(out.plan.action,'analyze');assert.equal(request.stream,false);await assert.rejects(modelPlan('x','local-test','ollama',async()=>({ok:true,json:async()=>({message:{content:'{"action":"delete"}'}})}),{}),/未允许/);});
test('manual real-model response uses the same contract',()=>{assert.match(manualPrompt('分析这张谱'),/不得生成核数据/);assert.deepEqual(parseModelPlan('```json\n{"action":"analyze"}\n```'),{action:'analyze'});assert.throws(()=>parseModelPlan('{"action":"calibrate"}'),/未允许/);});
test('model cannot invent or alter a query energy',()=>{assert.deepEqual(validatePlanForPrompt({action:'query',energyKeV:1274.5},'查询 1.2745 MeV'),{action:'query',energyKeV:1274.5});assert.throws(()=>validatePlanForPrompt({action:'query',energyKeV:661.657},'查一下能量'),/未提供/);assert.throws(()=>validatePlanForPrompt({action:'query',energyKeV:662},'查询 661.657 keV'),/修改/);});
test('OpenAI-compatible, Anthropic and Gemini adapters normalize plans',async()=>{
  const cases=[
    ['openai-compatible',{choices:[{message:{content:'{"action":"peaks"}'}}]},{NAA_MODEL_BASE_URL:'https://models.example/v1',NAA_MODEL_API_KEY:'secret'},'/chat/completions'],
    ['anthropic',{content:[{type:'text',text:'{"action":"reliability"}'}]},{ANTHROPIC_API_KEY:'secret'},'api.anthropic.com'],
    ['gemini',{candidates:[{content:{parts:[{text:'{"action":"report"}'}]}}]},{GEMINI_API_KEY:'secret'},'generativelanguage.googleapis.com']
  ];
  for(const [provider,payload,env,urlPart] of cases){let url,headers;const out=await modelPlan('测试','model-x',provider,async(u,o)=>{url=u;headers=o.headers;return {ok:true,json:async()=>payload}},env);assert.ok(url.includes(urlPart));assert.ok(headers);assert.ok(['peaks','reliability','report'].includes(out.plan.action));}
});
test('remote compatible endpoint requires HTTPS and server-side key',async()=>{await assert.rejects(modelPlan('x','m','openai-compatible',async()=>assert.fail(),{NAA_MODEL_BASE_URL:'http://remote.example/v1',NAA_MODEL_API_KEY:'x'}),/HTTPS/);await assert.rejects(modelPlan('x','m','openai-compatible',async()=>assert.fail(),{NAA_MODEL_BASE_URL:'https://remote.example/v1'}),/API_KEY/);});
