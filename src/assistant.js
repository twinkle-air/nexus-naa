export const actions=['analyze','peaks','match','query','reliability','report','help'];
export const ROUTER_SYSTEM_PROMPT='你是 Nexus-NAA 能谱工具路由器。把用户请求转换为一个操作：analyze 分析当前谱；peaks 寻峰；match 对当前已标定峰执行核素候选匹配；query 查询用户指定的能量（将 MeV 转为 keV）；reliability 解释当前结果可靠性；report 生成报告；help 表示不支持。只输出 JSON 对象，例如 {"action":"analyze"}、{"action":"match"} 或 {"action":"query","energyKeV":661.657}。不得生成核数据、峰参数、标定点或实验结论。';
export function manualPrompt(prompt){if(typeof prompt!=='string'||!prompt.trim()||prompt.length>4000)throw new Error('请输入 1–4000 字的问题。');return `${ROUTER_SYSTEM_PROMPT}\n\n用户请求：${prompt}\n\n只输出 JSON：`;}
export function parseModelPlan(text){if(typeof text!=='string'||!text.trim())throw new Error('请粘贴模型返回的 JSON。');const cleaned=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');let plan;try{plan=JSON.parse(cleaned)}catch{throw new Error('模型输出不是有效 JSON。')}return validatePlan(plan);}
export function validatePlanForPrompt(plan,prompt){plan=validatePlan(plan);if(plan.action==='query'){const m=prompt.match(/(\d+(?:\.\d+)?)\s*(keV|千电子伏|MeV)/i);if(!m)throw new Error('模型试图查询用户未提供的能量。');const expected=Number(m[1])*(m[2].toLowerCase()==='mev'?1000:1);if(Math.abs(plan.energyKeV-expected)>1e-6)throw new Error('模型修改了用户提供的查询能量。');}return plan;}
export function offlinePlan(prompt){
  const m=prompt.match(/(\d+(?:\.\d+)?)\s*(keV|千电子伏|MeV)/i);
  if(m)return {action:'query',energyKeV:Number(m[1])*(m[2].toLowerCase()==='mev'?1000:1)};
  if(/可靠|证据|置信|确定|为什么/.test(prompt))return {action:'reliability'};
  if(/报告|report/i.test(prompt))return {action:'report'};
  if(/寻峰|找.*峰|显著峰|peak/i.test(prompt))return {action:'peaks'};
  if(/匹配.*(核素|候选)|核素.*匹配/.test(prompt))return {action:'match'};
  if(/分析|analy/i.test(prompt))return {action:'analyze'};
  return {action:'help'};
}
export function validatePlan(plan){if(!plan||!actions.includes(plan.action))throw new Error('模型返回了未允许的操作。');if(plan.action==='query'&&(!Number.isFinite(plan.energyKeV)||plan.energyKeV<=0))throw new Error('模型没有提供有效查询能量。');return {action:plan.action,...(plan.action==='query'?{energyKeV:plan.energyKeV}:{})};}
export function explain(result){return `文件：${result.source.filename}\nQC：${result.qc.level.toUpperCase()}；总计数 ${result.qc.summary.totalCounts}。\n${result.peaks===null?'尚未寻峰':`检出 ${result.peaks.length} 个候选峰`}；${result.calibration?'已按用户参考点标定':'缺少标定，请输入至少两个参考点'}。\n${result.matching===null?'尚未匹配核素。':result.matching.map(m=>`峰 ${m.peakId}：${m.candidates.length?m.candidates.map(c=>`${c.nuclide} (${c.status})`).join('、'):'证据不足，库内无命中'}`).join('\n')}\n单峰能量吻合仅支持候选关联；核数据库是有限子集，未命中不能排除核素。`}
export function executePlan(plan,workspace,options={}){
  validatePlan(plan);
  if(plan.action==='help')return {text:'支持：分析这张谱、找出显著峰、匹配核素候选、661.657 keV 可能是什么、这个判断可靠吗、生成报告。离线模式按这些意图路由。'};
  if(plan.action==='query'){const rows=workspace.query(plan.energyKeV,options.matchSettings?.toleranceKeV??2,options.matchSettings?.topN??3);return {query:{energyKeV:plan.energyKeV,rows},text:`数据库查询 ${plan.energyKeV} keV（不属于测量检出结论）：\n`+(rows.length?rows.map(r=>`${r.nuclide}，参考 ${r.energyKeV} keV，差 ${r.deltaKeV.toFixed(4)} keV；来源 ${r.source.name} ${r.source.url}`).join('\n'):'有限数据库内无匹配，证据不足。')};}
  if(plan.action==='analyze'||plan.action==='report')workspace.analyze(options);
  if(plan.action==='peaks')workspace.search(options.settings);
  if(plan.action==='match')workspace.match(options.matchSettings);
  const result=workspace.snapshot();
  return {text:explain(result),result,report:plan.action==='report'};
}
