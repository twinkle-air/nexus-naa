const translations = new Map(Object.entries({
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
  '导入一份能谱，工作区将在这里展开':'Import a spectrum to open the workspace','核心算法离线运行 · v0.4 核素候选及报告':'Core algorithms run offline · v0.4 candidates and reports','谱数据来源':'Spectrum sources','核数据来源':'Nuclear-data sources','方法说明':'Methods',
  '语言':'Language','使用指南':'User guide','关闭':'Close','快速开始':'Quick start','导入与检查':'Import and inspect','寻峰与标定':'Peaks and calibration','候选与报告':'Candidates and reports','智能体接入':'Agent integration',
  '核数据浏览器':'Nuclear Data Browser','筛选核素或能量':'Filter nuclide or energy','例如 Ba-133 或 356.0129':'e.g. Ba-133 or 356.0129','表中数据用于候选匹配，不代表实测检出。':'Table data supports candidate matching and does not represent measured detection.','核素':'Nuclide','发射概率 / %':'Emission probability / %','来源':'Source','数据资格':'Data qualification',
  '保存的 JSON 可恢复当前谱、参数和分析结果；机器字段名保持稳定，不随显示语言改变。':'Saved JSON can restore the spectrum, settings and analysis results; machine field names remain stable across display languages.',
  '选择或拖入 CSV、TXT、DAT、SPE、XLS 或 XLSX 能谱。':'Choose or drop a CSV, TXT, DAT, SPE, XLS or XLSX spectrum.','核对通道数、总计数和质量检查警告。':'Check the channel count, total counts and QC warnings.','执行寻峰，检查弱峰显著性与峰形。':'Run peak search and inspect weak-peak significance and shape.','手动输入标定点，或选择已知标准源自动填入后人工确认。':'Enter calibration points manually, or auto-fill from a known source and verify them.','匹配核素候选并导出 CSV、JSON 或完整 HTML 报告。':'Match nuclide candidates and export CSV, JSON or a full HTML report.',
  '文本文件应包含 channel、counts 两列；SPE 读取 $DATA 区段。Excel 不可用时系统自动使用只读解析器。警告不会被静默忽略。':'Text files should contain channel and counts columns; SPE imports the $DATA section. If Excel is unavailable, the read-only parser is used automatically. Warnings are never silently discarded.','局部显著性模式更利于保留弱峰，但降低 σ 阈值会增加假峰。自动标定只生成建议，不会替你确认参考线。':'Local-significance mode retains weak peaks more readily, but lowering σ increases false peaks. Automatic calibration generates suggestions and does not confirm reference lines for you.','数据库命中仅表示能量相容。应结合伴随峰、效率、几何、照射和冷却条件判断；“未命中”不等于排除。':'A database match indicates energy compatibility only. Consider companion peaks, efficiency, geometry, irradiation and cooling conditions; no match does not mean exclusion.','网页助手支持离线规则、手动真实模型验证和多个 API；Codex、Claude Code 等宿主可通过 MCP 调用同一套科学工具。':'The web assistant supports offline rules, manual real-model validation and multiple APIs. Hosts such as Codex and Claude Code can call the same scientific tools through MCP.'
}));

let language = localStorage.getItem('nexus-language') === 'en' ? 'en' : 'zh';

function translateValue(value){
  if(language==='zh')return value;
  if(translations.has(value.trim()))return value.replace(value.trim(),translations.get(value.trim()));
  return value
    .replace(/（(\d+) 条主要参考线）/g,' ($1 primary lines)')
    .replace(/① 导入谱：等待/g,'① Spectrum: waiting').replace(/① 导入谱：已共享/g,'① Spectrum: shared')
    .replace(/② 寻峰：等待/g,'② Peaks: waiting').replace(/② 寻峰：已完成 \((\d+)\)/g,'② Peaks: complete ($1)')
    .replace(/③ 标定：可选\/未完成/g,'③ Calibration: optional / pending').replace(/③ 标定：可选/g,'③ Calibration: optional').replace(/③ 标定：已应用/g,'③ Calibration: applied')
    .replace(/④ 候选\/报告：等待/g,'④ Candidates / report: waiting').replace(/④ 候选：等待；报告可用/g,'④ Candidates: waiting; report ready')
    .replace(/核数据已就绪 · (\d+) 条/g,'Nuclear data ready · $1 lines').replace(/获取 /g,'retrieved ')
    .replace(/执行寻峰后显示结果/g,'Run peak search to show results').replace(/未发现基础格式问题/g,'No basic format issues found');
}

function applyLanguage(){
  document.documentElement.lang=language==='en'?'en':'zh-CN';
  document.title=language==='en'?'Nexus-NAA · Spectrum Analyzer':'Nexus-NAA · 能谱分析器';
  for(const node of document.querySelectorAll('body *')){
    if(['SCRIPT','STYLE','TEXTAREA'].includes(node.tagName)||(node.tagName==='PRE'&&node.id!=='answer'))continue;
    for(const child of node.childNodes)if(child.nodeType===Node.TEXT_NODE&&child.textContent.trim()){
      if(!child.__zh)child.__zh=child.textContent;
      child.textContent=language==='zh'?child.__zh:translateValue(child.__zh);
    }
    if(node instanceof HTMLInputElement&&node.placeholder){if(!node.dataset.zhPlaceholder)node.dataset.zhPlaceholder=node.placeholder;node.placeholder=language==='zh'?node.dataset.zhPlaceholder:translateValue(node.dataset.zhPlaceholder)}
    if(node.hasAttribute('aria-label')){if(!node.dataset.zhAria)node.dataset.zhAria=node.getAttribute('aria-label');node.setAttribute('aria-label',language==='zh'?node.dataset.zhAria:translateValue(node.dataset.zhAria))}
  }
  document.querySelectorAll('[data-lang]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.lang===language)));
  localStorage.setItem('nexus-language',language);
}

const observer=new MutationObserver(records=>{if(language!=='en')return;for(const record of records)for(const node of record.addedNodes){if(node.nodeType===Node.TEXT_NODE&&node.parentElement&&node.parentElement.tagName!=='TEXTAREA'&&(node.parentElement.tagName!=='PRE'||node.parentElement.id==='answer')){node.__zh=node.textContent;node.textContent=translateValue(node.textContent)}else if(node.nodeType===Node.ELEMENT_NODE)applyLanguage()}});

document.querySelector('#languageButton').onclick=()=>document.querySelector('#languageMenu').classList.toggle('hidden');
document.querySelectorAll('[data-lang]').forEach(button=>button.onclick=()=>{language=button.dataset.lang;document.querySelector('#languageMenu').classList.add('hidden');applyLanguage();window.dispatchEvent(new CustomEvent('nexus-language-change',{detail:{language}}))});
document.querySelector('#guideButton').onclick=()=>document.querySelector('#guideDialog').showModal();
document.querySelector('#closeGuide').onclick=()=>document.querySelector('#guideDialog').close();
document.querySelector('#guideDialog').onclick=e=>{if(e.target===e.currentTarget)e.currentTarget.close()};
window.uiLanguage=()=>language;
applyLanguage();
observer.observe(document.body,{childList:true,subtree:true});
