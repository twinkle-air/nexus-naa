export class SpectrumError extends Error {
  constructor(message, code = "INVALID_SPECTRUM") { super(message); this.code = code; }
}

export function convertSpeText(text) {
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/), marker=lines.findIndex(v=>v.trim().toUpperCase()==='$DATA:');
  if(marker<0)throw new SpectrumError('SPE 文件缺少 $DATA: 区段。','INVALID_SPE');
  const range=(lines[marker+1]||'').trim().split(/\s+/).map(Number);
  if(range.length!==2||!range.every(Number.isSafeInteger)||range[0]<0||range[1]<range[0])throw new SpectrumError('SPE 的 $DATA 通道范围无效。','INVALID_SPE');
  const needed=range[1]-range[0]+1, rows=[];
  for(let i=0;i<needed;i++){const raw=(lines[marker+2+i]??'').trim(),value=Number(raw);if(raw===''||!Number.isFinite(value)||value<0)throw new SpectrumError(`SPE 的第 ${i+1} 个计数无效或缺失。`,'INVALID_SPE');rows.push(`${range[0]+i},${value}`)}
  return rows.join('\n');
}

function splitLine(line) {
  if (line.includes(",")) return line.split(",");
  if (line.includes(";")) return line.split(";");
  return line.trim().split(/\s+/);
}

export function parseSpectrum(text, filename = "spectrum.csv") {
  if (!text || !text.trim()) throw new SpectrumError("文件为空。", "EMPTY_FILE");
  const isSpe=/^\s*\$[A-Z_]+:/mi.test(text)&&/^\s*\$DATA:/mi.test(text);if(isSpe)text=convertSpeText(text);
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map(v => v.trim()).filter(v => v && !v.startsWith("#"));
  if (!lines.length) throw new SpectrumError("文件没有可读取的数据行。", "EMPTY_FILE");

  let start = 0;
  const first = splitLine(lines[0]).map(v => v.trim().toLowerCase());
  if (first.length === 2 && first[0] === 'channel' && first[1] === 'counts') start = 1;
  if (start >= lines.length) throw new SpectrumError("表头之后没有数据。", "EMPTY_FILE");

  const channels = [], counts = [];
  for (let i = start; i < lines.length; i++) {
    const cells = splitLine(lines[i]).map(v => v.trim());
    if (cells.length !== 2 || cells[0] === "" || cells[1] === "") throw new SpectrumError(`第 ${i + 1} 行必须恰有 channel 和 counts 两列。`, "MISSING_COLUMN");
    const channel = Number(cells[0]);
    const count = Number(cells[1]);
    if (!Number.isFinite(channel) || !Number.isFinite(count)) throw new SpectrumError(`第 ${i + 1} 行包含非数值。`, "NON_NUMERIC");
    if (count < 0) throw new SpectrumError(`第 ${i + 1} 行计数为负数。`, "NEGATIVE_COUNTS");
    if (!Number.isSafeInteger(channel) || channel < 0) throw new SpectrumError('通道必须为非负整数。');
    channels.push(channel); counts.push(count);
  }
  if (new Set(channels).size !== channels.length) throw new SpectrumError("存在重复通道。", "DUPLICATE_CHANNEL");
  for (let i = 1; i < channels.length; i++) if (channels[i] <= channels[i - 1]) throw new SpectrumError("通道必须严格递增。", "UNSORTED_CHANNEL");

  const warnings = [];
  const gaps = channels.slice(1).filter((v, i) => v - channels[i] !== 1).length;
  if (gaps) warnings.push(`发现 ${gaps} 处非连续通道。`);
  if (counts.reduce((a, b) => a + b, 0) < 100) warnings.push("总计数低于 100，统计量可能不足。");
  return { filename, format:isSpe?'SPE':'delimited-text', channels, counts, warnings };
}

export function summarizeSpectrum(spectrum) {
  const { channels, counts } = spectrum;
  if (!channels.length) throw new SpectrumError("能谱没有数据。", "EMPTY_FILE");
  let total = 0, max = -Infinity, maxIndex = 0;
  counts.forEach((value, index) => { total += value; if (value > max) { max = value; maxIndex = index; } });
  return {
    channelCount: channels.length,
    totalCounts: total,
    meanCounts: total / channels.length,
    maxCounts: max,
    maxChannel: channels[maxIndex],
    minChannel: channels[0],
    maxChannelNumber: channels.at(-1)
  };
}

export function qcSpectrum(spectrum) {
  const summary = summarizeSpectrum(spectrum);
  const checks = [
    { label: "文件可读取", level: "pass", detail: `${summary.channelCount} 个有效通道` },
    { label: "计数有效", level: "pass", detail: "全部为有限非负数" },
    { label: "通道唯一且递增", level: "pass", detail: `${summary.minChannel}–${summary.maxChannelNumber}` },
    ...spectrum.warnings.map(detail => ({ label: "数据提示", level: "warning", detail }))
  ];
  return { level: spectrum.warnings.length ? "warning" : "pass", checks, summary };
}

export function movingAverage(values, window = 5) {
  const w = Math.max(1, Math.floor(window) | 1);
  const half = Math.floor(w / 2);
  return values.map((_, i) => {
    let sum = 0, n = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(values.length - 1, i + half); j++) { sum += values[j]; n++; }
    return sum / n;
  });
}

export function estimateSnipBackground(values,iterations=24){
  if(!Array.isArray(values)||values.length<3||values.some(v=>!Number.isFinite(v)||v<0)||!Number.isInteger(iterations)||iterations<1||iterations>Math.floor((values.length-1)/2))throw new SpectrumError('SNIP 本底参数无效。','INVALID_SNIP');
  const transform=v=>Math.log(Math.log(Math.sqrt(v+1)+1)+1),inverse=z=>(Math.exp(Math.exp(z)-1)-1)**2-1,out=values.map(transform);
  for(let p=iterations;p>=1;p--)for(let i=p;i<out.length-p;i++)out[i]=Math.min(out[i],(out[i-p]+out[i+p])/2);
  return out.map(v=>Math.max(0,inverse(v)));
}

function crossing(values, peak, level, direction) {
  let i = peak;
  while (i + direction >= 0 && i + direction < values.length && values[i + direction] > level) i += direction;
  const j = i + direction;
  if (j < 0 || j >= values.length) return i;
  const dy = values[j] - values[i];
  return dy === 0 ? i : i + (level - values[i]) / dy * direction;
}

export function analyzePeak(counts, index, baseline, prominence) {
  const halfLevel = baseline + prominence / 2;
  const leftHalf = crossing(counts, index, halfLevel, -1);
  const rightHalf = crossing(counts, index, halfLevel, 1);
  const halfWidth = Math.max(2, Math.ceil((rightHalf - leftHalf) * 1.25));
  const roiStart = Math.max(0, index - halfWidth), roiEnd = Math.min(counts.length - 1, index + halfWidth);
  let netArea = 0, weighted = 0;
  for (let i = roiStart; i <= roiEnd; i++) {
    const bg = counts[roiStart] + (counts[roiEnd] - counts[roiStart]) * (i - roiStart) / Math.max(1, roiEnd - roiStart);
    const net = Math.max(0, counts[i] - bg); netArea += net; weighted += net * i;
  }
  return { index, centroidIndex: netArea ? weighted / netArea : index, height: counts[index], prominence, fwhmChannels: rightHalf - leftHalf, roiStart, roiEnd, netArea };
}

export function findPeaks(spectrum, options = {}) {
  const { smoothingWindow = 5, minProminencePercent = 5, minDistance = 8, detectionMode='adaptive', minSignificance=4, snipIterations=24 } = options;
  if (!['adaptive','global','snip'].includes(detectionMode)||!Number.isFinite(minSignificance)||minSignificance<2||minSignificance>20||!Number.isInteger(snipIterations)||snipIterations<1||!Number.isInteger(smoothingWindow) || smoothingWindow < 1 || smoothingWindow > 101 || smoothingWindow % 2 === 0 || !Number.isInteger(minDistance) || minDistance < 1 || !Number.isFinite(minProminencePercent) || minProminencePercent <= 0 || minProminencePercent > 100) throw new SpectrumError('寻峰参数无效。');
  if (spectrum.channels.some((v,i)=>i && v-spectrum.channels[i-1]!==1)) throw new SpectrumError('寻峰需要连续通道；请补齐原始数据，不自动补零。');
  const y = movingAverage(spectrum.counts, smoothingWindow),snipBackground=detectionMode==='snip'?estimateSnipBackground(y,Math.min(snipIterations,Math.floor((y.length-1)/2))):null,searchY=snipBackground?y.map((v,i)=>Math.max(0,v-snipBackground[i])):y;
  const globalMax = y.reduce((a,b)=>Math.max(a,b),1), threshold = globalMax * minProminencePercent / 100;
  const candidates = [];
  const radius = Math.max(3, Math.round(minDistance * 1.5));
  for (let i = 1; i < y.length - 1; i++) {
    if (!(searchY[i] > searchY[i - 1] && searchY[i] >= searchY[i + 1])) continue;
    let leftMin = y[i], rightMin = y[i];
    for (let j = Math.max(0, i - radius); j < i; j++) leftMin = Math.min(leftMin, y[j]);
    for (let j = i + 1; j <= Math.min(y.length - 1, i + radius); j++) rightMin = Math.min(rightMin, y[j]);
    const baseline = snipBackground?snipBackground[i]:Math.max(leftMin, rightMin), prominence=snipBackground?searchY[i]:y[i]-baseline, noiseLevel=snipBackground?y[i]+baseline:baseline,significance=prominence/Math.sqrt(Math.max(1,noiseLevel/smoothingWindow));
    if ((detectionMode==='global'&&prominence>=threshold)||(['adaptive','snip'].includes(detectionMode)&&significance>=minSignificance)) candidates.push({...analyzePeak(y, i, baseline, prominence),significance,detectionMode,backgroundMethod:snipBackground?'snip_lls_decreasing_window':'local_minima'});
  }
  candidates.sort((a, b) => b.prominence - a.prominence);
  const kept = [];
  for(const peak of candidates){const separated=kept.every(p=>Math.abs(p.index-peak.index)>=minDistance),notBroadShoulder=kept.every(p=>!(peak.roiStart<=p.index&&p.index<=peak.roiEnd&&peak.fwhmChannels>3*p.fwhmChannels));if(separated&&notBroadShoulder)kept.push(peak)}
  const result=kept.sort((a, b) => a.index - b.index).map(p => {
    let netArea=0, weighted=0, positive=0;
    for(let i=p.roiStart;i<=p.roiEnd;i++) {
      const bg=spectrum.counts[p.roiStart]+(spectrum.counts[p.roiEnd]-spectrum.counts[p.roiStart])*(i-p.roiStart)/(p.roiEnd-p.roiStart);
      const net=spectrum.counts[i]-bg; netArea+=net;
      weighted+=Math.max(0,net)*i; positive+=Math.max(0,net);
    }
    return {...p, height:spectrum.counts[p.index], netArea, centroidIndex:positive?weighted/positive:p.index, widthMethod:'smoothed_local_half_prominence', areaMethod:'raw_signed_linear_endpoint_ROI'};
  }).map((p, id) => ({
    id: id + 1, ...p, channel: spectrum.channels[p.index], centroidChannel: interpolateChannel(spectrum.channels, p.centroidIndex), energyKeV: null
  }));
  if(options.fitOverlaps)for(let i=0;i<result.length-1;i++){const a=result[i],b=result[i+1],limit=1.75*Math.max(a.fwhmChannels,b.fwhmChannels);if(b.index-a.index<=limit){try{const fit=fitGaussianDoublet(spectrum.counts,a,b);a.overlapFit=fit;b.overlapFit=fit}catch{}}}
  return result;
}

function interpolateChannel(channels, index) {
  const lo = Math.max(0, Math.min(channels.length - 1, Math.floor(index))), hi = Math.min(channels.length - 1, lo + 1);
  return channels[lo] + (channels[hi] - channels[lo]) * (index - lo);
}

function solveLinearSystem(matrix,vector){const n=vector.length,a=matrix.map((row,i)=>[...row,vector[i]]);for(let c=0;c<n;c++){let pivot=c;for(let r=c+1;r<n;r++)if(Math.abs(a[r][c])>Math.abs(a[pivot][c]))pivot=r;if(Math.abs(a[pivot][c])<1e-12)return null;[a[c],a[pivot]]=[a[pivot],a[c]];const d=a[c][c];for(let j=c;j<=n;j++)a[c][j]/=d;for(let r=0;r<n;r++)if(r!==c){const f=a[r][c];for(let j=c;j<=n;j++)a[r][j]-=f*a[c][j]}}return a.map(row=>row[n])}
export function fitGaussianDoublet(counts,leftPeak,rightPeak){
  if(!Array.isArray(counts)||counts.length<9||!leftPeak||!rightPeak)throw new SpectrumError('双峰拟合输入无效。','INVALID_DOUBLET');
  const ordered=[leftPeak,rightPeak].sort((a,b)=>a.index-b.index),sig0=ordered.map(p=>Math.max(1,(p.fwhmChannels||4.71)/2.35482)),start=Math.max(0,Math.floor(ordered[0].index-4*sig0[0])),end=Math.min(counts.length-1,Math.ceil(ordered[1].index+4*sig0[1]));
  if(end-start<8)throw new SpectrumError('双峰拟合区间过窄。','INVALID_DOUBLET');let best=null;const offsets=[-1,-.5,0,.5,1],factors=[.75,1,1.25];
  for(const o1 of offsets)for(const o2 of offsets)for(const f1 of factors)for(const f2 of factors){const mu=[ordered[0].index+o1,ordered[1].index+o2],sigma=[sig0[0]*f1,sig0[1]*f2];if(mu[0]>=mu[1])continue;const normal=Array.from({length:4},()=>Array(4).fill(0)),rhs=Array(4).fill(0);for(let i=start;i<=end;i++){const x=(i-start)/(end-start)-.5,g1=Math.exp(-.5*((i-mu[0])/sigma[0])**2),g2=Math.exp(-.5*((i-mu[1])/sigma[1])**2),row=[1,x,g1,g2],w=1/Math.max(1,counts[i]);for(let a=0;a<4;a++){rhs[a]+=w*row[a]*counts[i];for(let b=0;b<4;b++)normal[a][b]+=w*row[a]*row[b]}}const coeff=solveLinearSystem(normal,rhs);if(!coeff||coeff[2]<0||coeff[3]<0)continue;let objective=0,residualSum=0;for(let i=start;i<=end;i++){const x=(i-start)/(end-start)-.5,pred=coeff[0]+coeff[1]*x+coeff[2]*Math.exp(-.5*((i-mu[0])/sigma[0])**2)+coeff[3]*Math.exp(-.5*((i-mu[1])/sigma[1])**2),res=counts[i]-pred;objective+=res*res/Math.max(1,counts[i]);residualSum+=res*res}if(!best||objective<best.objective)best={objective,rmse:Math.sqrt(residualSum/(end-start+1)),background:{intercept:coeff[0],slopePerRoi:coeff[1]},components:mu.map((center,j)=>({centerIndex:center,sigmaChannels:sigma[j],fwhmChannels:2.35482*sigma[j],height:coeff[j+2],area:coeff[j+2]*sigma[j]*Math.sqrt(2*Math.PI)})),roiStart:start,roiEnd:end}}
  if(!best)throw new SpectrumError('双Gaussian拟合未找到物理可接受解。','DOUBLET_FIT_FAILED');return {...best,method:'bounded_grid_weighted_double_gaussian_linear_background',converged:true};
}

export function fitLinearCalibration(points) {
  if (!Array.isArray(points) || points.length < 2) throw new SpectrumError("线性标定至少需要两个参考点。", "INSUFFICIENT_CALIBRATION_POINTS");
  for (const p of points) if (!Number.isFinite(p.channel) || !Number.isFinite(p.energyKeV)) throw new SpectrumError("标定点必须是有限数值。", "INVALID_CALIBRATION_POINT");
  if (new Set(points.map(p => p.channel)).size !== points.length) throw new SpectrumError("标定参考通道不能重复。", "DUPLICATE_CALIBRATION_CHANNEL");
  const n=points.length, mx=points.reduce((s,p)=>s+p.channel,0)/n, my=points.reduce((s,p)=>s+p.energyKeV,0)/n;
  const den=points.reduce((s,p)=>s+(p.channel-mx)**2,0); if (den===0) throw new SpectrumError("标定通道没有跨度。", "DEGENERATE_CALIBRATION");
  const slope=points.reduce((s,p)=>s+(p.channel-mx)*(p.energyKeV-my),0)/den, intercept=my-slope*mx;
  if (!Number.isFinite(slope) || slope<=0 || !Number.isFinite(intercept)) throw new SpectrumError('能量标定斜率必须为正有限数。');
  const residuals=points.map(p=>({channel:p.channel,energyKeV:p.energyKeV,predictedKeV:slope*p.channel+intercept,residualKeV:p.energyKeV-(slope*p.channel+intercept)}));
  const rmse=Math.sqrt(residuals.reduce((s,p)=>s+p.residualKeV**2,0)/n), total=points.reduce((s,p)=>s+(p.energyKeV-my)**2,0);
  const rSquared=total===0?1:1-residuals.reduce((s,p)=>s+p.residualKeV**2,0)/total;
  return { model:"linear", slope, intercept, rmse, rSquared, points:residuals };
}

export function applyCalibration(peaks, calibration) { return peaks.map(p => ({...p, energyKeV: calibration.slope*p.centroidChannel+calibration.intercept, fwhmKeV: Math.abs(calibration.slope)*p.fwhmChannels })); }

function combinations(items,n,start=0,prefix=[],out=[]){if(prefix.length===n){out.push(prefix);return out}for(let i=start;i<=items.length-(n-prefix.length);i++)combinations(items,n,i+1,[...prefix,items[i]],out);return out}
export function suggestCalibrationPoints(peaks,database,nuclide){
  if(!Array.isArray(peaks)||peaks.length<2)throw new SpectrumError('自动建议至少需要两个已寻得峰。','INSUFFICIENT_PEAKS');
  if(typeof nuclide!=='string'||!nuclide.trim())throw new SpectrumError('请选择已知标准源核素。','REFERENCE_NUCLIDE_REQUIRED');
  const allLines=database?.lines?.filter(x=>x.nuclide===nuclide).sort((a,b)=>b.intensityPercent-a.intensityPercent);
  const useful=allLines?.filter(x=>x.intensityPercent>=1)??[];
  const lines=useful.length>=2?useful:allLines;
  if(!lines||lines.length<2)throw new SpectrumError('该核素在当前库中不足两条可用参考线。','INSUFFICIENT_REFERENCE_LINES');
  const refs=lines.slice(0,Math.min(4,lines.length,peaks.length)).sort((a,b)=>a.energyKeV-b.energyKeV),n=refs.length,candidatePeaks=[...peaks].sort((a,b)=>(b.prominence||b.height||0)-(a.prominence||a.height||0)).slice(0,24);
  let best=null;
  for(const group of combinations(candidatePeaks,n)){
    const ordered=[...group].sort((a,b)=>a.centroidChannel-b.centroidChannel),points=ordered.map((p,i)=>({channel:p.centroidChannel,energyKeV:refs[i].energyKeV,peakId:p.id,lineId:refs[i].id,sourceUrl:refs[i].sourceUrl}));
    const fit=fitLinearCalibration(points),strength=ordered.reduce((sum,p)=>sum+(p.prominence||p.height||0),0),quality=fit.rmse-strength*1e-12;
    if(!best||quality<best.quality)best={quality,fit,points};
  }
  const referenceSpanKeV=refs.at(-1).energyKeV-refs[0].energyKeV,channelSpan=best.points.at(-1).channel-best.points[0].channel;
  const cautions=['这是基于已知标准源的自动建议；请核对峰形、参考线和残差后再应用。'];if(n===2)cautions.push('两点拟合的零 RMSE 是数学必然，不是独立准确性验证；建议用第三条独立参考线复核。');if(referenceSpanKeV<200)cautions.push(`参考线仅覆盖 ${referenceSpanKeV.toFixed(3)} keV，区间外能量属于外推，应谨慎使用。`);if(refs.some(x=>x.mode==='annihilation'))cautions.push('511 keV 湮没线可作能量参考，但不能唯一识别核素。');
  return {nuclide,points:best.points,calibration:best.fit,method:'known-source_peak-line_assignment',diagnostics:{pointCount:n,referenceRangeKeV:[refs[0].energyKeV,refs.at(-1).energyKeV],referenceSpanKeV,channelSpan,peakCandidatesConsidered:candidatePeaks.length,totalDetectedPeaks:peaks.length},warning:cautions.join(' ')};
}

export function parseCalibrationPoints(text) {
  const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean); const points=[];
  for(let i=0;i<lines.length;i++){const cells=lines[i].split(/[,;\s]+/);if(i===0&&cells[0].toLowerCase()==='channel'&&/^energy_?kev$/i.test(cells[1]))continue;if(cells.length!==2||cells.some(c=>c===''||!Number.isFinite(Number(c))))throw new SpectrumError(`标定点第 ${i+1} 行无效。`,"INVALID_CALIBRATION_POINT");points.push({channel:Number(cells[0]),energyKeV:Number(cells[1])})}
  return points;
}

export function analysisExport(spectrum, qc, peaks, calibration, settings, matching = null, evidence = null) {
  return { schemaVersion:"0.3", generatedAt:new Date().toISOString(), source:{filename:spectrum.filename}, qc, calibration, peakSearch:settings, peaks:peaks.map(({index,centroidIndex,...p})=>p), matching, evidence, warnings:["峰面积为局部线性本底 ROI 初步积分，未经 Gaussian 拟合。","核素候选仅为能量与共现证据辅助判断，不是确定检出。"] };
}

export function queryGammaLines(database, energyKeV, toleranceKeV = 2, limit = 5) {
  if (!database?.lines || !database?.sources) throw new SpectrumError("核数据库不可用或格式错误。", "NUCLEAR_DATABASE_UNAVAILABLE");
  if (!Number.isFinite(energyKeV) || energyKeV <= 0 || !Number.isFinite(toleranceKeV) || toleranceKeV <= 0 || !Number.isInteger(limit) || limit < 1) throw new SpectrumError("查询能量、容差和结果数量必须为有效正数。", "INVALID_GAMMA_QUERY");
  return database.lines.map(line => ({...line, deltaKeV:energyKeV-line.energyKeV, absDeltaKeV:Math.abs(energyKeV-line.energyKeV), source:database.sources[line.sourceId]})).filter(line=>line.absDeltaKeV<=toleranceKeV).sort((a,b)=>a.absDeltaKeV-b.absDeltaKeV||b.intensityPercent-a.intensityPercent).slice(0,limit);
}

export function matchPeakCandidates(peaks, database, options = {}) {
  const toleranceKeV = Number(options.toleranceKeV ?? 2), topN = Number(options.topN ?? 3);
  if (!Number.isFinite(toleranceKeV) || toleranceKeV <= 0 || !Number.isInteger(topN) || topN < 1) throw new SpectrumError("Top-N 必须为正整数。", "INVALID_GAMMA_QUERY");
  const measured = peaks.filter(p=>Number.isFinite(p.energyKeV));
  if (!measured.length) throw new SpectrumError("缺少能量标定，不能进行核素匹配。", "CALIBRATION_REQUIRED");
  return measured.map(peak => {
    const candidates=queryGammaLines(database,peak.energyKeV,toleranceKeV,Math.max(topN*3,topN)).map(line=>{
      const companionLines=database.lines.filter(x=>x.nuclide===line.nuclide&&x.energyKeV!==line.energyKeV&&x.intensityPercent>=5);
      const used=new Set([peak.id]);
      const companions=companionLines.map(expected=>{const inRange=!options.energyRange || (expected.energyKeV>=options.energyRange[0]&&expected.energyKeV<=options.energyRange[1]); const found=inRange?measured.find(p=>!used.has(p.id)&&Math.abs(p.energyKeV-expected.energyKeV)<=toleranceKeV):null;if(found)used.add(found.id);return {energyKeV:expected.energyKeV,intensityPercent:expected.intensityPercent,foundPeakId:found?.id??null,status:found?'found':inRange?'not_observed_not_excluded':'outside_range'}});
      const foundCount=companions.filter(c=>c.foundPeakId).length, energyScore=Math.max(0,1-line.absDeltaKeV/toleranceKeV), companionScore=companions.length?foundCount/companions.length:0;
      const score=Math.round(100*(0.75*energyScore+0.25*companionScore));
      let status="insufficient_evidence"; if(foundCount>0&&energyScore>=0.75)status="supported";else if(energyScore>=0.75&&companions.length===0)status="tentative";else if(foundCount>0)status="tentative";else if(energyScore<0.35)status="conflicting";
      if(line.mode==='annihilation')status='insufficient_evidence';
      return {...line,score,status,companions};
    }).sort((a,b)=>b.score-a.score||a.absDeltaKeV-b.absDeltaKeV).slice(0,topN);
    return {peakId:peak.id,measuredEnergyKeV:peak.energyKeV,toleranceKeV,candidates,conclusion:candidates.length?"candidate_only":"insufficient_evidence"};
  });
}

export function buildEvidence(spectrum, calibration, matches, database) {
  let id=0;const evidence=[];const next=()=>`EV-${String(++id).padStart(4,"0")}`;
  const sourceId=next();evidence.push({id:sourceId,type:"measured_spectrum",filename:spectrum.filename,sha256:spectrum.sha256??null,channelCount:spectrum.channels.length});
  const calId=next();evidence.push({id:calId,type:"calibration",model:calibration.model,slope:calibration.slope,intercept:calibration.intercept,rmseKeV:calibration.rmse,dependsOn:[sourceId]});
  const claims=[];
  for(const match of matches)for(const candidate of match.candidates){const dataId=next(),fitId=next();evidence.push({id:dataId,type:"nuclear_data",nuclide:candidate.nuclide,referenceEnergyKeV:candidate.energyKeV,sourceId:candidate.sourceId,recordId:candidate.id,sourcePage:candidate.sourcePage,sourceUrl:candidate.sourceUrl,datasetId:database.datasetId});evidence.push({id:fitId,type:"energy_match",peakId:match.peakId,measuredEnergyKeV:match.measuredEnergyKeV,referenceEnergyKeV:candidate.energyKeV,deltaKeV:candidate.deltaKeV,toleranceKeV:match.toleranceKeV,companionChecks:candidate.companions,dependsOn:[sourceId,calId,dataId]});claims.push({id:`CL-${String(claims.length+1).padStart(4,"0")}`,statement:`峰 ${match.peakId} 与 ${candidate.nuclide} 的 ${candidate.energyKeV} keV 线相容`,level:candidate.status,score:candidate.score,evidenceIds:[fitId,dataId],disclaimer:"候选关联，不代表确定检出"})}
  return {dataset:{id:database.datasetId,retrievedAt:database.retrievedAt,sources:database.sources},evidence,claims};
}
