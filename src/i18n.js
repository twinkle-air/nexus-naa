const translations = new Map(Object.entries({
  '质检':'QC','OpenAI 兼容 API':'OpenAI-compatible API',
  '文件可读取':'Readable file','计数有效':'Valid counts','全部为有限非负数':'All counts are finite and non-negative','通道唯一且递增':'Unique, increasing channels','数据提示':'Data warnings',
  '已载入确定性合成验证谱，参考标定来自生成公式 E=C。输入“分析这张谱”验证完整流程。':'Loaded the deterministic synthetic spectrum with reference calibration E=C. Enter “Analyze this spectrum” to test the workflow.',
  '没有符合条件的记录。':'No matching records.','离线操作助手':'Offline assistant',
  '尚未匹配核素。':'Nuclides have not been matched.',
  '单峰能量吻合仅支持候选关联；核数据库是有限子集，未命中不能排除核素。':'A single energy match supports only a candidate association. The database is a limited subset; no match does not exclude a nuclide.',
  '自动建议已填入，但尚未应用。请核对标准源、峰号和参考能量后点击“拟合并应用”。':'Suggestions filled but not applied. Check the source, peak IDs and reference energies, then click “Fit and apply”.',
  'HTML 报告已交给浏览器下载，请查看下载列表。报告包含当前完整谱与分析结果。':'The HTML report was sent to browser downloads and includes the complete current spectrum and analysis.',
  'SPE 的 $DATA 区段已导入并共享给全部功能区。':'The SPE $DATA section was imported and shared across all sections.',
  'Excel 中最长的两列数值数据已只读导入并共享给全部功能区。':'The longest two-column numeric table in Excel was imported read-only and shared across all sections.',
  '证据驱动能谱工作区':'Evidence-driven spectrum workspace','当前分析进度':'Current analysis progress','收起进度':'Close progress','中子活化分析助手 · V1.0':'NAA Copilot · V1.0',
  '能谱视图':'SPECTRUM VIEW','质量检查':'QUALITY CONTROL','能谱摘要':'SPECTRUM SUMMARY','寻峰设置':'PEAK SEARCH','能量标定':'ENERGY CALIBRATION','寻峰结果':'PEAK RESULTS','核素候选与证据':'NUCLIDE CANDIDATES & EVIDENCE','通过':'PASS','需复核':'WARNING','对数纵轴':'LOG Y','线性纵轴':'LINEAR Y','视图':'VIEW','通道':'Channel','计数':'Counts','全谱峰突出度':'Global prominence','半高全宽 / 通道':'FWHM / ch','积分区间':'ROI','候选数量':'Top-N','快捷操作':'Quick actions',
  '恢复分析 JSON':'Restore analysis JSON','发送给当前模型的完整提示':'Complete prompt for the current model','粘贴模型的原始 JSON 回复':'Paste the original model JSON response','例如 {"action":"analyze"}':'e.g. {"action":"analyze"}',
  '第一步生成提示并交给任意真实模型；第二步粘贴原始回复后再次执行。应用能验证输出契约，但不能认证回复确由哪个模型生成。':'First generate a prompt and send it to a real model. Then paste its original response and run again. The app validates the response contract but cannot authenticate its model of origin.',
  '输入当前共享谱，输出共享峰列表。默认按局部泊松显著性判断；SNIP模式先估计连续本底，更适合本底起伏明显的谱，但必须检查参数敏感性。':'Uses the shared spectrum and produces a shared peak list. The default uses local Poisson significance. SNIP estimates the continuous background first; check sensitivity to its parameters.',
  'σ 是筛查统计量，并非最终峰存在概率；降低阈值会增加假峰。SNIP迭代窗口应大于典型峰半宽，过大可能削弱宽峰。双Gaussian只处理已找到且相邻的峰，不会把单个宽峰强行拆峰。':'σ is a screening statistic, not a peak-existence probability. Lower thresholds increase false peaks. The SNIP window should exceed a typical peak half-width; excessive windows may weaken broad peaks. Double-Gaussian fitting only processes detected adjacent peaks.',
  '方式一：手动填写实验参考点。方式二：选择已知标准源，程序从当前谱自动寻峰并生成参考点建议。未知源不能仅凭两个峰唯一确定标定。':'Enter experimental reference points manually, or select a known source to suggest points from detected peaks. Two peaks alone cannot uniquely calibrate an unknown source.',
  '自动建议只填入，不自动应用；请核对后点击“拟合并应用”。':'Suggestions fill the reference points without applying them. Verify them, then click “Fit and apply”.',
  '* 净面积为局部线性本底 ROI 初步积分；σ 为弱峰筛查统计量。二者均未替代峰形拟合和不确定度评定。保存的 JSON 可恢复当前谱、参数和分析结果；机器字段名保持稳定，不随显示语言改变。':'* Net area is a preliminary ROI integral using a local linear background; σ screens weak peaks. Neither replaces peak fitting or uncertainty assessment. Saved JSON restores the spectrum, parameters and results; machine field names remain stable.',
  '正在载入核数据…':'Loading nuclear data…','核数据库不可用':'Nuclear database unavailable','完成标定并匹配后，在此显示 Top-N 候选、能量差、伴随峰和证据等级。':'After calibration and matching, candidates, energy differences, companion peaks and evidence levels appear here.',
  '有伴随峰支持':'Supported by companion peaks','暂定候选':'Tentative candidate','存在冲突':'Conflicting evidence','证据不足':'Insufficient evidence','容差范围内无数据库记录：证据不足':'No database records within tolerance: insufficient evidence','已寻峰：当前阈值下未找到峰':'Peak search complete: no peaks found at this threshold',
  '文件已载入，可以开始分析。':'File loaded. Ready to analyze.','正在读取新文件，旧结果已清除。':'Reading the new file; previous results cleared.','文件已载入并共享给全部功能区。':'File loaded and shared across all sections.','输入已修改，相关旧结果已失效，请重新执行。':'Inputs changed; dependent results invalidated. Run again.',
  '填写当前模型名称或版本标签':'Enter the current model name or version','填写实际 API 模型名':'Enter the API model name','例如 661.657':'e.g. 661.657',
  '用户提供的竞赛核素库':'User-supplied competition nuclide library workbook',
  '输入“分析这张谱”“找出显著峰”“1779 keV 可能是什么”“这个判断可靠吗”或“生成报告”。':'Try “Analyze this spectrum”, “Find significant peaks”, “What could 1779 keV be?”, “How reliable is this?” or “Generate report”.',
  '运行方式':'Mode','离线操作助手（规则路由）':'Offline assistant (rule router)','手动真实模型验证':'Manual real-model validation','模型名/验证标签':'Model / validation label','例如模型名称':'e.g. model name',
  'API 密钥及地址只从服务端环境变量读取。模型只选择操作；核谱计算和证据解释仍由本地工具完成。':'API keys and endpoints are read only from server environment variables. The model selects operations; spectrum calculations and evidence interpretation remain local.',
  '完整分析':'Full analysis','仅寻峰':'Peak search only','解释可靠性':'Explain reliability','生成报告':'Generate report','查询能量':'Query energy','查询核数据':'Query nuclear data','执行':'Run','也可以输入自然语言操作':'Or enter a natural-language operation','向助手提问':'Ask the assistant',
  '请先导入谱文件；单能量数据库查询不需要导入。':'Import a spectrum first; a single-energy database query needs no file.','下载完整 HTML 报告':'Download full HTML report','当前操作记录':'Operation log',
  'γ 能谱最小分析闭环':'Minimal gamma-spectrum workflow','先确认数据可信，':'Validate the data first,','再谈科学结论。':'then discuss scientific conclusions.','导入 channel–counts 文件，立即完成基础质量检查与交互式浏览。数据只在你的浏览器本地处理。':'Import a channel–counts file for immediate QC and interactive viewing. Data stays local to your browser.',
  '拖入能谱文件':'Drop a spectrum file','选择文件':'Choose file','载入公开 Cs-137 实测谱':'Load public Cs-137 spectrum','载入合成双峰验证谱（预设测试标定）':'Load synthetic two-peak validation spectrum','合成谱仅验证计算链路，非实测数据；公开 Cs-137 实测谱需要你自行指定可靠的参考标定。':'The synthetic spectrum validates only the computation chain. The public Cs-137 spectrum requires a trustworthy calibration supplied by you.',
  '共享数据流':'Shared data flow','所有区块共用同一份当前谱；下游结果由上游派生。更换文件或修改参数时，相关旧结果会自动失效。':'All sections share the current spectrum. Downstream results are derived from upstream data and are invalidated when files or parameters change.',
  '重置视图':'Reset view','更换文件':'Change file','计数—通道谱':'Counts–channel spectrum','原始计数':'Raw counts','滚轮缩放 · 拖动平移 · 悬停读取数值':'Wheel to zoom · drag to pan · hover to inspect',
  '通道数':'Channels','总计数':'Total counts','最大计数':'Maximum count','最大值通道':'Maximum channel','自动寻峰':'Automatic peak search','检测模式':'Detection mode','局部显著性（弱峰）':'Local significance (weak peaks)','SNIP 本底 + 局部显著性（实验）':'SNIP background + local significance (experimental)','全谱比例（兼容旧版）':'Global ratio (legacy)','最小局部显著性 σ':'Minimum local significance σ','SNIP 迭代窗口（通道）':'SNIP clipping window (channels)','平滑窗口':'Smoothing window','最小峰距（通道）':'Minimum peak distance (channels)','执行寻峰':'Find peaks',
  '对相邻峰执行双 Gaussian 局部拟合（实验）':'Fit adjacent peaks with a local double Gaussian (experimental)',
  '线性能量标定':'Linear energy calibration','已知标准源':'Known reference source','请选择':'Select','根据当前谱自动填入':'Auto-fill from current spectrum','拟合并应用':'Fit and apply','尚未标定':'Not calibrated','峰结果':'Peak results','恢复分析':'Restore analysis','导出 CSV':'Export CSV','保存分析 JSON':'Save analysis JSON','质心通道':'Centroid channel','能量 / keV':'Energy / keV','峰高':'Peak height','局部显著性 / σ':'Local significance / σ','净面积*':'Net area*',
  '核素候选辅助判断':'Nuclide candidate assessment','必须先完成能量标定。数据库命中只生成候选，不输出“确定检出”。':'Energy calibration is required. Database matches produce candidates, not confirmed detections.','容差 / keV':'Tolerance / keV','匹配全部峰':'Match all peaks','单能量查询':'Single-energy query','查询数据库':'Query database','核数据范围与来源':'Nuclear-data scope and sources',
  '导入一份能谱，工作区将在这里展开':'Import a spectrum to open the workspace','核心算法离线运行 · V1.0 核素候选及报告':'Core algorithms run offline · V1.0 candidates and reports','谱数据来源':'Spectrum sources','核数据来源':'Nuclear-data sources','方法说明':'Methods',
  '语言':'Language','使用指南':'User guide','关闭':'Close','快速开始':'Quick start','导入与检查':'Import and inspect','寻峰与标定':'Peaks and calibration','候选与报告':'Candidates and reports','智能体接入':'Agent integration',
  '核数据浏览器':'Nuclear Data Browser','筛选核素或能量':'Filter nuclide or energy','例如 Ba-133 或 356.0129':'e.g. Ba-133 or 356.0129','表中数据用于候选匹配，不代表实测检出。':'Table data supports candidate matching and does not represent measured detection.','核素':'Nuclide','发射概率 / %':'Emission probability / %','来源':'Source','数据资格':'Data qualification',
  '保存的 JSON 可恢复当前谱、参数和分析结果；机器字段名保持稳定，不随显示语言改变。':'Saved JSON can restore the spectrum, settings and analysis results; machine field names remain stable across display languages.',
  '选择或拖入 CSV、TXT、DAT、SPE、XLS 或 XLSX 能谱。':'Choose or drop a CSV, TXT, DAT, SPE, XLS or XLSX spectrum.','核对通道数、总计数和质量检查警告。':'Check the channel count, total counts and QC warnings.','执行寻峰，检查弱峰显著性与峰形。':'Run peak search and inspect weak-peak significance and shape.','手动输入标定点，或选择已知标准源自动填入后人工确认。':'Enter calibration points manually, or auto-fill from a known source and verify them.','匹配核素候选并导出 CSV、JSON 或完整 HTML 报告。':'Match nuclide candidates and export CSV, JSON or a full HTML report.',
  '文本文件应包含 channel、counts 两列；SPE 读取 $DATA 区段。Excel 不可用时系统自动使用只读解析器。警告不会被静默忽略。':'Text files should contain channel and counts columns; SPE imports the $DATA section. If Excel is unavailable, the read-only parser is used automatically. Warnings are never silently discarded.','局部显著性模式更利于保留弱峰，但降低 σ 阈值会增加假峰。自动标定只生成建议，不会替你确认参考线。':'Local-significance mode retains weak peaks more readily, but lowering σ increases false peaks. Automatic calibration generates suggestions and does not confirm reference lines for you.','数据库命中仅表示能量相容。应结合伴随峰、效率、几何、照射和冷却条件判断；“未命中”不等于排除。':'A database match indicates energy compatibility only. Consider companion peaks, efficiency, geometry, irradiation and cooling conditions; no match does not mean exclusion.','网页助手支持离线规则、手动真实模型验证和多个 API；Codex、Claude Code 等宿主可通过 MCP 调用同一套科学工具。':'The web assistant supports offline rules, manual real-model validation and multiple APIs. Hosts such as Codex and Claude Code can call the same scientific tools through MCP.'
}));

let language = localStorage.getItem('nexus-language') === 'en' ? 'en' : 'zh';
const reverseTranslations = new Map([...translations].map(([zh,en])=>[en,zh]));
function canonical(value){value=value.replace('全谱 prominence','全谱峰突出度');const trimmed=value.trim();return reverseTranslations.has(trimmed)?value.replace(trimmed,reverseTranslations.get(trimmed)):value;}

function translateValue(value){
  value=canonical(value);
  if(language==='zh')return value;
  if(translations.has(value.trim()))return value.replace(value.trim(),translations.get(value.trim()));
  if(value.includes('\n'))return value.split('\n').map(translateValue).join('\n');
  return value
    .replace(/进度 · 第([一二三四])阶段(（已完成）)?/g,(_,number,done)=>`Progress · Phase ${'一二三四'.indexOf(number)+1}${done?' (complete)':''}`)
    .replace(/第([一二三四])阶段(（已完成）)? · V1\.0/g,(_,number,done)=>`Phase ${'一二三四'.indexOf(number)+1}${done?' (complete)':''} · V1.0`)
    .replace(/^文件：/,'File: ').replace(/QC：(PASS|WARNING)；总计数 (.*?)。/g,'QC: $1; total counts $2.')
    .replace(/检出 (\d+) 个候选峰/g,'Found $1 candidate peaks').replace(/尚未寻峰/g,'Peak search pending')
    .replace(/；已按用户参考点标定。/g,'; calibrated using user reference points.').replace(/；缺少标定，请输入至少两个参考点。/g,'; calibration required: enter at least two reference points.')
    .replace(/^峰 (\d+)：/,'Peak $1: ').replace(/证据不足，库内无命中/g,'Insufficient evidence: no database matches')
    .replace(/^(✓|△) (.+)$/,(_,icon,label)=>`${icon} ${translateValue(label)}`)
    .replace(/(\d+) 个有效通道/g,'$1 valid channels')
    .replace(/通道 (\d+)–(\d+)/g,'Channels $1–$2').replace(/(\d+) 项提示需复核/g,'$1 warnings to review')
    .replace(/④ 候选：已完成 \((\d+) 峰组\)；报告可用/g,'④ Candidates: complete ($1 peak groups); report ready')
    .replace(/④ 候选：等待；报告等待/g,'④ Candidates: waiting; report pending')
    .replace(/评分 /g,'Score ').replace(/伴随峰 (\d+)\/(\d+)（未观察到不等于不存在）/g,'Companion peaks $1/$2 (not observed does not mean absent)')
    .replace(/峰 (查询|\d+) · (.*?) · 结论：(仅候选|证据不足)/g,(_,id,e,c)=>`Peak ${id==='查询'?'query':id} · ${e} · ${c==='仅候选'?'Candidates only':'Insufficient evidence'}`)
    .replace(/残差：/g,'Residuals: ').replace(/双Gaussian拟合；RMSE /g,'Double-Gaussian fit; RMSE ')
    .replace(/（(\d+) 条主要参考线）/g,' ($1 primary lines)')
    .replace(/① 导入谱：等待/g,'① Spectrum: waiting').replace(/① 导入谱：已共享/g,'① Spectrum: shared')
    .replace(/② 寻峰：等待/g,'② Peaks: waiting').replace(/② 寻峰：已完成 \((\d+)\)/g,'② Peaks: complete ($1)')
    .replace(/③ 标定：可选\/未完成/g,'③ Calibration: optional / pending').replace(/③ 标定：可选/g,'③ Calibration: optional').replace(/③ 标定：已应用/g,'③ Calibration: applied')
    .replace(/④ 候选\/报告：等待/g,'④ Candidates / report: waiting').replace(/④ 候选：等待；报告可用/g,'④ Candidates: waiting; report ready')
    .replace(/核数据已就绪 · (\d+) 条/g,'Nuclear data ready · $1 lines').replace(/获取 /g,'retrieved ')
    .replace(/执行寻峰后显示结果/g,'Run peak search to show results').replace(/未发现基础格式问题/g,'No basic format issues found');
}

const textState=new WeakMap(),attributeState=new WeakMap();
function chineseAnswer(value){return value.replace(/QC：PASS/g,'质量检查：通过').replace(/QC：WARNING/g,'质量检查：需复核').replace(/\(supported\)/g,'（有伴随峰支持）').replace(/\(tentative\)/g,'（暂定候选）').replace(/\(conflicted\)/g,'（存在冲突）').replace(/\(insufficient_evidence\)/g,'（证据不足）');}
function applyLanguage(){
  observer.disconnect();
  document.documentElement.lang=language==='en'?'en':'zh-CN';
  document.title=language==='en'?'Nexus-NAA · Spectrum Analyzer':'Nexus-NAA · 能谱分析器';
  for(const node of document.querySelectorAll('body *')){
    if(node.closest('script,style,pre:not(#answer),#filename,[data-lang]'))continue;
    for(const child of node.childNodes)if(node.tagName!=='TEXTAREA'&&child.nodeType===Node.TEXT_NODE&&child.textContent.trim()){
      let state=textState.get(child);
      if(!state||child.textContent!==state.rendered)state={source:canonical(child.textContent)};
      const rendered=language==='zh'?(node.closest('#answer')?chineseAnswer(state.source):state.source):translateValue(state.source);
      if(child.textContent!==rendered)child.textContent=rendered;
      textState.set(child,{source:state.source,rendered});
    }
    const attributes=attributeState.get(node)||{};
    for(const attr of ['placeholder','aria-label','title','data-tooltip'])if(node.hasAttribute(attr)){
      const value=node.getAttribute(attr);let state=attributes[attr];
      if(!state||value!==state.rendered)state={source:canonical(value)};
      const rendered=language==='zh'?state.source:translateValue(state.source);
      if(value!==rendered)node.setAttribute(attr,rendered);
      attributes[attr]={source:state.source,rendered};
    }
    attributeState.set(node,attributes);
  }
  document.querySelectorAll('[data-lang]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.lang===language)));
  localStorage.setItem('nexus-language',language);
  observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title','data-tooltip']});
}

const observer=new MutationObserver(()=>applyLanguage());

document.querySelector('#languageButton').onclick=()=>document.querySelector('#languageMenu').classList.toggle('hidden');
document.querySelectorAll('[data-lang]').forEach(button=>button.onclick=()=>{language=button.dataset.lang;document.querySelector('#languageMenu').classList.add('hidden');applyLanguage();window.dispatchEvent(new CustomEvent('nexus-language-change',{detail:{language}}))});
document.querySelector('#guideButton').onclick=()=>document.querySelector('#guideDialog').showModal();
document.querySelector('#closeGuide').onclick=()=>document.querySelector('#guideDialog').close();
document.querySelector('#guideDialog').onclick=e=>{if(e.target===e.currentTarget)e.currentTarget.close()};
window.uiLanguage=()=>language;
window.uiTranslate=translateValue;
applyLanguage();
