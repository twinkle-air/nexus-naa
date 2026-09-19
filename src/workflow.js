import {parseSpectrum,qcSpectrum,findPeaks,fitLinearCalibration,parseCalibrationPoints,applyCalibration,matchPeakCandidates,buildEvidence,queryGammaLines} from './core.js';

export class Workspace {
  constructor(database=null){this.database=database;this.reset();}
  reset(){this.spectrum=null;this.qc=null;this.calibration=null;this.peaks=null;this.matches=null;this.evidence=null;this.trace=[];this.revision=(this.revision||0)+1;this.settings={smoothingWindow:5,minProminencePercent:5,minDistance:8,detectionMode:'adaptive',minSignificance:4,snipIterations:24};this.matchSettings={toleranceKeV:2,topN:3};}
  load(text,name,sha256=null){this.reset();this.spectrum=parseSpectrum(text,name);this.spectrum.sha256=sha256;this.qc=qcSpectrum(this.spectrum);this.record('load_spectrum');this.record('quality_check');}
  record(tool,details={}){this.trace.push({tool,revision:this.revision,at:new Date().toISOString(),...details});}
  requireSpectrum(){if(!this.spectrum)throw new Error('请先导入有效能谱。');this.qc=qcSpectrum(this.spectrum);}
  invalidate(){this.matches=null;this.evidence=null;this.revision++;}
  calibrate(text){this.requireSpectrum();this.calibration=null;this.invalidate();if(this.peaks)this.peaks=this.peaks.map(p=>({...p,energyKeV:null,fwhmKeV:null}));const c=fitLinearCalibration(parseCalibrationPoints(text));this.calibration=c;if(this.peaks)this.peaks=applyCalibration(this.peaks,c);this.record('calibrate_energy');return c;}
  search(settings=this.settings){this.requireSpectrum();this.peaks=null;this.invalidate();this.settings={...settings};this.record('quality_check');this.peaks=findPeaks(this.spectrum,this.settings);if(this.calibration)this.peaks=applyCalibration(this.peaks,this.calibration);this.record('find_peaks');return this.peaks;}
  match(settings=this.matchSettings){this.requireSpectrum();this.invalidate();this.matchSettings={...settings};if(!this.calibration)throw new Error('缺少能量标定，不能匹配核素。');if(this.peaks===null)throw new Error('请先寻峰。');if(!this.database?.lines?.length)throw new Error('核数据库不可用。');const c=this.calibration;const energyRange=[c.slope*this.spectrum.channels[0]+c.intercept,c.slope*this.spectrum.channels.at(-1)+c.intercept];this.matches=matchPeakCandidates(this.peaks,this.database,{...settings,energyRange});this.evidence=buildEvidence(this.spectrum,c,this.matches,this.database);this.record('match_candidates');return this.matches;}
  analyze({calibrationText='',settings=this.settings,matchSettings=this.matchSettings}={}){this.requireSpectrum();this.record('quality_check');if(calibrationText.trim())this.calibrate(calibrationText);this.search(settings);if(this.calibration&&this.database)this.match(matchSettings);return this.snapshot();}
  query(energy,tolerance=2,topN=3){this.record('query_gamma');return queryGammaLines(this.database,energy,tolerance,topN);}
  snapshot(){this.requireSpectrum();return structuredClone({schemaVersion:'0.4',softwareVersion:'1.0.0',revision:this.revision,generatedAt:new Date().toISOString(),source:{filename:this.spectrum.filename,sha256:this.spectrum.sha256},spectrum:this.spectrum,qc:this.qc,calibration:this.calibration,peakSearch:this.settings,matchSettings:this.matchSettings,peaks:this.peaks,matching:this.matches,evidence:this.evidence,database:this.database?{datasetId:this.database.datasetId,sources:this.database.sources,scope:this.database.scope}:null,trace:this.trace,warnings:['局部显著性仅用于弱峰筛查，未校正多重比较；降低阈值会增加假峰。','峰面积使用原始计数与 ROI 端点线性本底，保留负残差。','宽度为平滑谱局部半突出度宽度，仅为孤立峰 FWHM 初估；重叠峰和复杂本底会偏差。','候选评分不是概率，单峰匹配不能确认检出。','参考点由用户指定；两个点 RMSE 为零不表示标定准确。',...(!this.calibration?['尚未标定，未进行核素匹配。']:[]),...(this.matches===null?['候选匹配尚未执行。']:[])]});}
  restore(snapshot){
    if(!snapshot||snapshot.schemaVersion!=='0.4'||!snapshot.spectrum||!Array.isArray(snapshot.spectrum.channels)||!Array.isArray(snapshot.spectrum.counts))throw new Error('不是受支持的 Nexus-NAA 格式版本 0.4 分析文件。');
    if(snapshot.spectrum.channels.length!==snapshot.spectrum.counts.length||snapshot.spectrum.channels.length===0)throw new Error('分析文件中的谱数组无效。');
    const text=snapshot.spectrum.channels.map((c,i)=>`${c},${snapshot.spectrum.counts[i]}`).join('\n');
    this.load(text,snapshot.source?.filename||snapshot.spectrum.filename||'restored-spectrum.csv',snapshot.source?.sha256||null);
    if(snapshot.calibration){if(!Number.isFinite(snapshot.calibration.slope)||snapshot.calibration.slope<=0||!Number.isFinite(snapshot.calibration.intercept))throw new Error('分析文件中的标定无效。');this.calibration=structuredClone(snapshot.calibration)}
    this.settings={...this.settings,...snapshot.peakSearch};this.matchSettings={...this.matchSettings,...snapshot.matchSettings};
    if(snapshot.peaks!==null){if(!Array.isArray(snapshot.peaks))throw new Error('分析文件中的峰列表无效。');this.search(this.settings)}
    if(snapshot.matching!==null&&this.peaks!==null&&this.calibration)this.match(this.matchSettings);
    this.record('restore_analysis',{sourceSchema:snapshot.schemaVersion,recomputed:true});return this.snapshot();
  }
}
