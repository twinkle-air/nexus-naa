import './i18n.js';
import { queryGammaLines, qcSpectrum, suggestCalibrationPoints } from "./core.js";
import {Workspace} from './workflow.js';
import {offlinePlan,executePlan,validatePlan,manualPrompt,parseModelPlan,validatePlanForPrompt} from './assistant.js';
import {htmlReport} from './report.js';
import {candidateReason} from './evidence-explanation.js';
import {syntheticDemo} from './demo.js';
const workspace=new Workspace();
let loadRevision=0;
let manualPreparedFor='';

const $ = id => document.getElementById(id);
const canvas = $("chart"), ctx = canvas.getContext("2d");
let spectrum, qc, view, peaks = [], calibration = null, settings = {}, nuclearDb = null, matches = null, evidenceChain = null, logY = false, dragging = false, lastX = 0;
const fmt = n => new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(n);

function showError(error) { $("toast").textContent = error.message || String(error); $("toast").classList.remove("hidden"); setTimeout(() => $("toast").classList.add("hidden"), 5000); }
async function loadText(text, name, bytes=null) {
  const request=++loadRevision;workspace.reset();sync();$('workspace').classList.add('hidden');$('empty').classList.remove('hidden');$('calPoints').value='';$('calResult').textContent='尚未标定';$('answer').textContent='正在读取新文件，旧结果已清除。';
  try {const hash=await sha256(bytes??new TextEncoder().encode(text));if(request!==loadRevision)return;workspace.load(text,name,hash);sync();view=[0,spectrum.channels.length-1];refresh();$('answer').textContent='文件已载入，可以开始分析。';}catch(e){showError(e);$('answer').textContent=`导入失败：${e.message}`;}
}
function sync(){spectrum=workspace.spectrum;qc=workspace.qc;peaks=workspace.peaks||[];calibration=workspace.calibration;matches=workspace.matches;evidenceChain=workspace.evidence;settings=workspace.settings;}
function refresh(){sync();updateFlow();if(spectrum){renderUI();renderPeaks();renderMatches();draw();}if(!calibration)$('calResult').textContent='尚未标定';else $('calResult').textContent=`E = ${calibration.slope.toFixed(6)} C + (${calibration.intercept.toFixed(4)}) keV；RMSE ${calibration.rmse.toFixed(4)} keV\n残差：${calibration.points.map(p=>p.residualKeV.toFixed(4)).join(', ')}`;$('trace').textContent=JSON.stringify(workspace.trace,null,2);}
function flow(id,text,ready){$(id).textContent=text;$(id).classList.toggle('ready',ready)}
function updateFlow(){flow('flowData',`① 导入谱：${spectrum?'已共享':'等待'}`,Boolean(spectrum));flow('flowPeaks',`② 寻峰：${workspace.peaks===null?'等待':`已完成 (${workspace.peaks.length})`}`,workspace.peaks!==null);flow('flowCalibration',`③ 标定：${calibration?'已应用':'可选/未完成'}`,Boolean(calibration));flow('flowCandidates',`④ 候选：${workspace.matches===null?'等待':`已完成 (${workspace.matches.length} 峰组)`}；报告${spectrum?'可用':'等待'}`,workspace.matches!==null);}
function options(){return {calibrationText:$('calPoints').value,settings:{smoothingWindow:Number($('smooth').value),minProminencePercent:Number($('prominence').value),minDistance:Number($('distance').value),detectionMode:$('detectionMode').value,minSignificance:Number($('significance').value),snipIterations:Number($('snipIterations').value),fitOverlaps:$('fitOverlaps').checked},matchSettings:{toleranceKeV:Number($('tolerance').value),topN:Number($('topN').value)}};}
async function sha256(bytes){const hash=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,"0")).join("")}
function decodeSpectrumText(bytes){try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{return new TextDecoder('gb18030',{fatal:true}).decode(bytes)}}
async function loadFile(file) {
  if(!file)return;
  try{
    const bytes=await file.arrayBuffer(),ext=(file.name.match(/\.[^.]+$/)?.[0]||'').toLowerCase();
    let text,importWarnings=[];
    if(ext==='.xls'||ext==='.xlsx'){
      const response=await fetch('/api/import/spreadsheet',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Filename':encodeURIComponent(file.name)},body:bytes});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Excel 导入失败');text=result.spectrumText;importWarnings=result.warnings||[];
    }else text=decodeSpectrumText(bytes);
    await loadText(text,file.name,bytes);
    if(importWarnings.length){workspace.spectrum.warnings.push(...importWarnings);workspace.qc=qcSpectrum(workspace.spectrum);refresh();}
    let message='文件已载入并共享给全部功能区。';
    if(ext==='.spe')message='SPE 的 $DATA 区段已导入并共享给全部功能区。';
    if(ext==='.xls'||ext==='.xlsx')message='Excel 中最长的两列数值数据已只读导入并共享给全部功能区。';
    $('answer').textContent=message+(importWarnings.length?'\n注意：'+importWarnings.join('\n'):'');
  }catch(e){workspace.reset();$('calPoints').value='';refresh();$('workspace').classList.add('hidden');$('empty').classList.remove('hidden');$('answer').textContent='读取失败：'+e.message;showError(e);}
}

function renderUI() {
  $("empty").classList.add("hidden"); $("workspace").classList.remove("hidden");
  $("filename").textContent = spectrum.filename; $("range").textContent = `通道 ${qc.summary.minChannel}–${qc.summary.maxChannelNumber}`;
  const warning = qc.level === "warning"; $("statusIcon").textContent = warning ? "!" : "✓"; $("statusText").textContent = warning ? "WARNING" : "PASS";
  $("statusText").style.color = warning ? "var(--warn)" : "var(--cyan)"; $("statusSub").textContent = warning ? `${spectrum.warnings.length} 项提示需复核` : "未发现基础格式问题";
  $("checks").innerHTML = qc.checks.map(c => `<div class="check"><span>${c.level === "warning" ? "△" : "✓"} ${c.label}</span><em>${c.detail}</em></div>`).join("");
  $("sChannels").textContent = fmt(qc.summary.channelCount); $("sTotal").textContent = fmt(qc.summary.totalCounts); $("sMax").textContent = fmt(qc.summary.maxCounts); $("sPeak").textContent = fmt(qc.summary.maxChannel);
}

function geometry() { const dpr = devicePixelRatio || 1, rect = canvas.getBoundingClientRect(); canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; ctx.setTransform(dpr,0,0,dpr,0,0); return { w:rect.width,h:rect.height,l:55,r:16,t:18,b:38 }; }
function draw() {
  if (!spectrum) return; const g=geometry(), [a,b]=view, vals=spectrum.counts.slice(a,b+1), max=vals.reduce((a,b)=>Math.max(a,b),1), yMax=logY?Math.log10(max+1):max;
  ctx.clearRect(0,0,g.w,g.h); ctx.strokeStyle="#d8e3e9"; ctx.fillStyle="#526b7c"; ctx.font="11px monospace"; ctx.lineWidth=1;
  for(let i=0;i<=5;i++){const y=g.t+(g.h-g.t-g.b)*i/5;ctx.beginPath();ctx.moveTo(g.l,y);ctx.lineTo(g.w-g.r,y);ctx.stroke();const val=logY?Math.pow(10,yMax*(1-i/5))-1:max*(1-i/5);ctx.fillText(fmt(val),4,y+4)}
  ctx.beginPath(); ctx.strokeStyle="#24d6c8"; ctx.lineWidth=1.5;
  for(let i=a;i<=b;i++){const x=g.l+(g.w-g.l-g.r)*(i-a)/Math.max(1,b-a), value=logY?Math.log10(spectrum.counts[i]+1):spectrum.counts[i], y=g.h-g.b-(g.h-g.t-g.b)*value/yMax;i===a?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke();
  ctx.fillStyle="#526b7c"; for(let i=0;i<=5;i++){const idx=Math.round(a+(b-a)*i/5),x=g.l+(g.w-g.l-g.r)*i/5;ctx.fillText(fmt(spectrum.channels[idx]),x-12,g.h-12)}
  for(const peak of peaks){if(peak.index<a||peak.index>b)continue;const x=g.l+(g.w-g.l-g.r)*(peak.index-a)/Math.max(1,b-a),value=logY?Math.log10(spectrum.counts[peak.index]+1):spectrum.counts[peak.index],y=g.h-g.b-(g.h-g.t-g.b)*value/yMax;ctx.strokeStyle="#ffbd59";ctx.fillStyle="#ffbd59";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x,y-17);ctx.stroke();ctx.fillText(String(peak.id),x-3,y-21)}
}

function renderPeaks(){
  $("peakCount").textContent=peaks.length; $("exportCsv").disabled=workspace.peaks===null; $("exportJson").disabled=!spectrum;
  $("peakRows").innerHTML=peaks.length?peaks.map(p=>{const component=p.overlapFit?.components?.reduce((best,x)=>!best||Math.abs(x.centerIndex-p.index)<Math.abs(best.centerIndex-p.index)?x:best,null),fit=component?`<br><small title="双Gaussian拟合；RMSE ${p.overlapFit.rmse.toFixed(3)}">Gaussian ${fmt(component.fwhmChannels)}</small>`:'';return `<tr><td>${p.id}</td><td>${fmt(p.centroidChannel)}</td><td>${p.energyKeV==null?"—":fmt(p.energyKeV)}</td><td>${fmt(p.height)}</td><td>${p.significance==null?"—":p.significance.toFixed(2)}</td><td>${fmt(p.netArea)}</td><td>${fmt(p.fwhmChannels)}${fit}</td><td>${fmt(spectrum.channels[p.roiStart])}–${fmt(spectrum.channels[p.roiEnd])}</td></tr>`}).join(""):`<tr><td colspan="8" class="no-data">${workspace.peaks===null?"执行寻峰后显示结果":"已寻峰：当前阈值下未找到峰"}</td></tr>`;
}
function statusLabel(value){return ({supported:"有伴随峰支持",tentative:"暂定候选",conflicting:"存在冲突",insufficient_evidence:"证据不足"})[value]||value}
function renderMatches(groups=matches){
  if(!groups?.length){$("candidateResults").innerHTML=`<div class="no-candidates">完成标定并匹配后，在此显示 Top-N 候选、能量差、伴随峰和证据等级。</div>`;return}
  $("candidateResults").innerHTML=groups.map(group=>`<section class="match-group"><h3>峰 ${group.peakId??"查询"} · ${fmt(group.measuredEnergyKeV)} keV · 结论：${group.candidates.length?"仅候选":"证据不足"}</h3>${group.candidates.length?group.candidates.map(c=>{const found=c.companions?.filter(x=>x.foundPeakId!=null).length??0,total=c.companions?.length??0,reason=candidateReason(c,found,total,group.toleranceKeV,window.uiLanguage?.()||'zh').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');return `<div class="candidate"><strong>${c.nuclide} · ${fmt(c.energyKeV)} keV</strong><span>ΔE ${c.deltaKeV>=0?"+":""}${c.deltaKeV.toFixed(4)} keV</span><span class="score">评分 ${c.score??"—"}</span><span tabindex="0" class="status ${c.status||"insufficient_evidence"}" data-tooltip="${reason}" aria-label="${statusLabel(c.status||"insufficient_evidence")}：${reason}">${statusLabel(c.status||"insufficient_evidence")}</span><small>伴随峰 ${found}/${total}（未观察到不等于不存在） · <a href="${c.sourceUrl||c.source.url}" target="_blank" rel="noreferrer">${c.sourceId}</a></small></div>`}).join(""):`<div class="no-candidates">容差范围内无数据库记录：证据不足</div>`}</section>`).join("");
}
function download(name,text,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function pointAt(clientX){const rect=canvas.getBoundingClientRect(),g={l:55,r:16,w:rect.width},ratio=Math.max(0,Math.min(1,(clientX-rect.left-55)/(rect.width-71)));return Math.round(view[0]+ratio*(view[1]-view[0]));}
canvas.addEventListener("wheel",e=>{e.preventDefault();if(!spectrum||spectrum.channels.length<2)return;const center=pointAt(e.clientX),span=Math.max(1,view[1]-view[0]),limit=spectrum.channels.length-1,next=Math.min(limit,Math.max(1,Math.round(span*(e.deltaY>0?1.25:.8))));let a=Math.round(center-(center-view[0])*next/span);a=Math.max(0,Math.min(limit-next,a));view=[a,a+next];draw()},{passive:false});
canvas.addEventListener("mousedown",e=>{dragging=true;lastX=e.clientX}); window.addEventListener("mouseup",()=>dragging=false); canvas.addEventListener("mousemove",e=>{if(!spectrum)return;if(dragging){const span=view[1]-view[0],dx=Math.round((lastX-e.clientX)*span/canvas.clientWidth);if(dx){let a=Math.max(0,Math.min(spectrum.channels.length-1-span,view[0]+dx));view=[a,a+span];lastX=e.clientX;draw()}}const i=pointAt(e.clientX),rect=canvas.getBoundingClientRect();$("tip").innerHTML=`Channel <b>${fmt(spectrum.channels[i])}</b><br>Counts <b>${fmt(spectrum.counts[i])}</b>`;$("tip").style.left=`${Math.min(e.clientX-rect.left+12,rect.width-130)}px`;$("tip").style.top=`${Math.max(8,e.clientY-rect.top-55)}px`;$("tip").classList.remove("hidden")}); canvas.addEventListener("mouseleave",()=>$("tip").classList.add("hidden"));
$("choose").onclick=()=>$("file").click(); $("newfile").onclick=()=>$("file").click(); $("file").onchange=e=>loadFile(e.target.files[0]); $("demo").onclick=async()=>{try{const response=await fetch("data/demo_cs137.csv");if(!response.ok)throw new Error("演示谱加载失败");const bytes=await response.arrayBuffer();await loadText(new TextDecoder("utf-8",{fatal:true}).decode(bytes),"demo_cs137.csv",bytes);}catch(e){showError(e)}};
$("reset").onclick=()=>{view=[0,spectrum.channels.length-1];draw()}; $("log").onclick=()=>{logY=!logY;$("log").textContent=logY?"LINEAR Y":"LOG Y";draw()}; window.addEventListener("resize",draw);
$("prominence").oninput=e=>$("promValue").textContent=`${e.target.value}%`;
$("detectionMode").addEventListener("change",()=>{if($("detectionMode").value==="snip"&&Number($("significance").value)<8){$("significance").value=8;$("answer").textContent="SNIP模式已采用实测标准谱筛查起点 8σ；这不是通用最优值，请比较不同窗口和阈值。"}});
$("query").onclick=()=>{try{const energy=Number($("queryEnergy").value),tolerance=Number($("tolerance").value);const candidates=queryGammaLines(nuclearDb,energy,tolerance,Number($("topN").value)).map(c=>({...c,status:"insufficient_evidence",companions:[]}));renderMatches([{peakId:null,measuredEnergyKeV:energy,toleranceKeV:tolerance,candidates}])}catch(e){showError(e)}};
$("exportCsv").onclick=()=>{const en=window.uiLanguage?.()==='en',head=en?"id,centroid_channel,energy_keV,height,local_significance_sigma,detection_mode,net_area_roi,fwhm_channels,roi_start,roi_end":"编号,质心通道,能量_keV,峰高,局部显著性_sigma,检测模式,ROI净面积,FWHM_通道,ROI起点,ROI终点",rows=peaks.map(p=>[p.id,p.centroidChannel,p.energyKeV??"",p.height,p.significance??"",p.detectionMode??"",p.netArea,p.fwhmChannels,spectrum.channels[p.roiStart],spectrum.channels[p.roiEnd]].join(",")),suffix=en?'_peaks.csv':'_峰结果.csv';download(`${spectrum.filename.replace(/\.[^.]+$/,'')}${suffix}`,['\ufeff'+head,...rows].join("\n"),"text/csv;charset=utf-8")};
for(const event of ["dragenter","dragover"]){$("drop").addEventListener(event,e=>{e.preventDefault();$("drop").classList.add("drag")})}for(const event of ["dragleave","drop"]){$("drop").addEventListener(event,e=>{$("drop").classList.remove("drag");if(event==="drop"){e.preventDefault();loadFile(e.dataTransfer.files[0])}})}

function populateCalibrationSources(db){const counts=new Map();for(const line of db.lines)if(line.intensityPercent>=1)counts.set(line.nuclide,(counts.get(line.nuclide)||0)+1);for(const name of [...counts].filter(([,n])=>n>=2).map(([name])=>name).sort()){const option=document.createElement('option');option.value=name;option.textContent=`${name}（${counts.get(name)} 条主要参考线）`;$('calNuclide').append(option)}$('suggestCalibration').disabled=false;}
function renderDatabaseTable(){if(!nuclearDb)return;const en=window.uiLanguage?.()==='en',term=$('databaseFilter').value.trim().toLowerCase(),rows=nuclearDb.lines.filter(line=>!term||line.nuclide.toLowerCase().includes(term)||String(line.energyKeV).includes(term)||line.proxyFor?.toLowerCase().includes(term)).sort((a,b)=>a.nuclide.localeCompare(b.nuclide)||a.energyKeV-b.energyKeV);$('databaseSummary').textContent=en?`${new Set(nuclearDb.lines.map(x=>x.nuclide)).size} nuclides · ${nuclearDb.lines.length} lines · showing ${rows.length}`:`${new Set(nuclearDb.lines.map(x=>x.nuclide)).size} 种核素 · ${nuclearDb.lines.length} 条谱线 · 当前显示 ${rows.length} 条`;$('databaseRows').innerHTML=rows.map(line=>{const source=nuclearDb.sources[line.sourceId],iaea=line.verification==='checked_against_report',audited=line.verification==='independently_reviewed',reviewed=iaea||audited,qualification=iaea?(en?'IAEA report checked':'IAEA 报告已核对'):audited?(en?'Supplied; independently reviewed':'用户提供；已独立审查'):(en?'Supplied; not independently evaluated':'用户提供；尚未独立评价'),link=line.auditSourceUrl||line.sourceUrl,proxy=line.proxyFor?(en?` (proxy for ${line.proxyFor}; equilibrium required)`:`（${line.proxyFor} 间接指示；需确认平衡）`):'';return `<tr><td><b>${line.nuclide}</b>${proxy}</td><td>${line.energyKeV}</td><td>${line.intensityPercent}</td><td><a href="${link}" target="_blank" rel="noreferrer">${source.name}</a></td><td><span class="source-qualification ${reviewed?'reviewed':'supplied'}" title="${line.proxyCondition||qualification}">${qualification}</span></td></tr>`}).join('')||`<tr><td colspan="5">${en?'No matching records.':'没有符合条件的记录。'}</td></tr>`}
fetch("data/nuclear-lines.json").then(r=>{if(!r.ok)throw new Error();return r.json()}).then(db=>{nuclearDb=db;workspace.database=db;populateCalibrationSources(db);renderDatabaseTable();$("dbStatus").textContent=`核数据已就绪 · ${db.lines.length} 条`;$("dbVersion").textContent=`${db.datasetId} · 获取 ${db.retrievedAt}`}).catch(()=>{$("dbStatus").textContent="核数据库不可用"});

function guarded(fn){return ()=>{try{fn();}catch(e){showError(e);$('answer').textContent=e.message;}finally{refresh();}};}
$('find').onclick=guarded(()=>workspace.search(options().settings));
$('calibrate').onclick=guarded(()=>workspace.calibrate($('calPoints').value));
$('suggestCalibration').onclick=guarded(()=>{if(workspace.peaks===null)workspace.search(options().settings);const suggestion=suggestCalibrationPoints(workspace.peaks,nuclearDb,$('calNuclide').value);workspace.invalidate();workspace.calibration=null;workspace.peaks=workspace.peaks.map(p=>({...p,energyKeV:null,fwhmKeV:null}));$('calPoints').value='channel,energy_keV\n'+suggestion.points.map(p=>`${p.channel.toFixed(6)},${p.energyKeV.toFixed(6)}`).join('\n');$('autoCalResult').textContent=`建议：${suggestion.nuclide}；峰 ${suggestion.points.map(p=>p.peakId).join('、')}；预拟合 RMSE ${suggestion.calibration.rmse.toFixed(4)} keV。${suggestion.warning}`;workspace.record('suggest_calibration',{nuclide:suggestion.nuclide,peakIds:suggestion.points.map(p=>p.peakId),lineIds:suggestion.points.map(p=>p.lineId)});$('answer').textContent='自动建议已填入，但尚未应用。请核对标准源、峰号和参考能量后点击“拟合并应用”。';});
$('identify').onclick=guarded(()=>workspace.match(options().matchSettings));
$('exportJson').onclick=guarded(()=>{const lang=window.uiLanguage?.()||'zh',snapshot=workspace.snapshot();snapshot.displayLanguage=lang;download(lang==='en'?'analysis.json':'分析结果.json',JSON.stringify(snapshot,null,2),'application/json')});
$('restoreJson').onclick=()=>$('analysisFile').click();
$('analysisFile').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;workspace.restore(JSON.parse(await file.text()));sync();view=[0,spectrum.channels.length-1];$('calPoints').value=calibration?.points?.map(p=>`${p.channel},${p.energyKeV}`).join('\n')||'';for(const [id,key] of [['smooth','smoothingWindow'],['distance','minDistance'],['prominence','minProminencePercent'],['detectionMode','detectionMode'],['significance','minSignificance'],['snipIterations','snipIterations']])if(settings[key]!=null)$(id).value=settings[key];$('fitOverlaps').checked=Boolean(settings.fitOverlaps);$('tolerance').value=workspace.matchSettings.toleranceKeV;$('topN').value=workspace.matchSettings.topN;refresh();$('answer').textContent='分析文件已恢复，并已用当前版本重新计算派生结果；请复核原始文件哈希、标定点和参数。';}catch(error){showError(error)}finally{e.target.value=''}};
$('report').onclick=guarded(()=>{const lang=window.uiLanguage?.()||'zh';download(lang==='en'?'Nexus-NAA-report.html':'Nexus-NAA-分析报告.html',htmlReport(workspace.snapshot(),lang),'text/html');$('answer').textContent='HTML 报告已交给浏览器下载，请查看下载列表。报告包含当前完整谱与分析结果。';});
$('syntheticDemo').onclick=async()=>{await loadText(syntheticDemo(),'SYNTHETIC-Co60-validation.csv');$('calPoints').value='0,0\n1500,1500';$('answer').textContent='已载入确定性合成验证谱，参考标定来自生成公式 E=C。输入“分析这张谱”验证完整流程。';};
$('assistantMode').onchange=()=>{const manual=$('assistantMode').value==='manual';$('manualPanel').classList.toggle('hidden',!manual);$('modelName').placeholder=manual?'填写当前模型名称或版本标签':'填写实际 API 模型名';};
for(const id of ['calPoints','smooth','distance','prominence','detectionMode','significance','snipIterations','fitOverlaps','tolerance','topN'])$(id).addEventListener('input',()=>{
  workspace.invalidate();if(id==='calPoints'){workspace.calibration=null;if(workspace.peaks)workspace.peaks=workspace.peaks.map(p=>({...p,energyKeV:null,fwhmKeV:null}));}
  if(['smooth','distance','prominence','detectionMode','significance','snipIterations','fitOverlaps'].includes(id))workspace.peaks=null;
  $('answer').textContent='输入已修改，相关旧结果已失效，请重新执行。';refresh();
});
function runAssistantCommand(command){$('prompt').value=command;$('assistantForm').requestSubmit()}
for(const button of document.querySelectorAll('[data-command]'))button.onclick=()=>runAssistantCommand(button.dataset.command);
$('quickQuery').onclick=()=>{const energy=$('quickEnergy').value.trim();$('databaseFilter').value=energy;renderDatabaseTable();$('databaseDialog').showModal()};
$('databaseFilter').oninput=renderDatabaseTable;
$('closeDatabase').onclick=()=>$('databaseDialog').close();
$('databaseDialog').onclick=e=>{if(e.target===e.currentTarget)e.currentTarget.close()};
window.addEventListener('nexus-language-change',()=>{if(nuclearDb&&$('databaseDialog').open)renderDatabaseTable();if(matches)renderMatches()});
$('assistantForm').onsubmit=async event=>{event.preventDefault();const prompt=$('prompt').value.trim();if(!prompt)return;const revision=workspace.revision;$('send').disabled=true;try{
  const mode=$('assistantMode').value;let plan,provenance;
  if(mode==='manual'){const prepared=manualPrompt(prompt);if(manualPreparedFor!==prompt){manualPreparedFor=prompt;$('manualPrompt').value=prepared;$('manualResponse').value='';$('answer').textContent='已生成完整路由提示。请将它发送给当前真实模型，原样粘贴 JSON 回复后再次执行。';return}plan=validatePlanForPrompt(parseModelPlan($('manualResponse').value),prompt);provenance={provider:'manual',model:$('modelName').value.trim()||'unlabeled',origin:'user_pasted_not_authenticated'};}
  else if(mode!=='offline'){$('answer').textContent='正在等待模型（最长 45 秒）…';const response=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,model:$('modelName').value,provider:mode}),signal:AbortSignal.timeout(50000)});const payload=await response.json();if(!response.ok)throw new Error(payload.error||'模型不可用，可切换离线操作助手。');plan=validatePlan(payload.plan);provenance={provider:payload.provider,model:payload.model,origin:'server_api'};}else{plan=offlinePlan(prompt);provenance={provider:'offline-rules',model:'none',origin:'deterministic'};}
  if(revision!==workspace.revision)throw new Error('分析输入已改变，本次助手操作已取消，请重新提交。');
  workspace.record('assistant_plan',{...provenance,action:plan.action});const result=executePlan(plan,workspace,options());refresh();$('answer').textContent=(mode==='offline'?'离线操作助手\n':mode==='manual'?'手动真实模型输出已通过契约校验；来源未经应用认证\n':`${provenance.provider} 模型选择操作；工具生成证据解释\n`)+result.text;
  if(result.report){const lang=window.uiLanguage?.()||'zh';download(lang==='en'?'Nexus-NAA-report.html':'Nexus-NAA-分析报告.html',htmlReport(result.result,lang),'text/html')}
}catch(e){refresh();$('answer').textContent=e.message;}finally{$('send').disabled=false;}};
