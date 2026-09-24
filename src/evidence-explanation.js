export function candidateReason(candidate,found,total,toleranceKeV,lang='zh'){
  const en=lang==='en',delta=Math.abs(candidate.deltaKeV??0).toFixed(4),tol=Number(toleranceKeV??2).toFixed(4),window=Number.isFinite(candidate.supportWindowKeV)?candidate.supportWindowKeV.toFixed(4):null,eligible=(candidate.companions||[]).filter(x=>x.supportEligible).length;
  const labels={OUTSIDE_SUPPORT_WINDOW:['残差超出支持窗','residual outside the support window'],CLOSER_COMPETING_LINE:['存在更接近的异核素参考线','a closer cross-nuclide reference line exists'],UNRESOLVED_PEAK_ARTIFACT:['峰可能由未解决的逃逸、求和或重叠结构解释','the peak has an unresolved escape, sum, or overlap explanation'],PEAK_WIDTH_UNAVAILABLE:['缺少峰宽','peak width unavailable'],CALIBRATION_RMSE_UNAVAILABLE:['缺少标定 RMSE','calibration RMSE unavailable'],CALIBRATION_OUTSIDE_REFERENCE_RANGE:['位于参考标定能区外','outside the reference calibration range'],CALIBRATION_RANGE_UNAVAILABLE:['缺少参考标定能区','reference calibration range unavailable'],NON_UNIQUE_511_KEV:['511 keV 线不具唯一性','the 511 keV line is non-unique'],NOT_OBSERVED:['未观察到','not observed']};
  const exclusions=(candidate.supportExclusionReasons||[]).map(code=>labels[code]?.[en?1:0]??code);
  const suffix=exclusions.length?(en?` Excluded from support because: ${exclusions.join('; ')}.`:` 不计入支持，原因：${exclusions.join('；')}。`):'';
  if(candidate.status==='supported')return en?`Energy difference ${delta} keV is inside the ${window} keV support window; this line and ${eligible}/${total} companion lines passed support-eligibility checks.`:`能量差 ${delta} keV 位于 ${window} keV 支持窗内；本线及 ${eligible}/${total} 条伴随线通过支持资格审查。`;
  if(candidate.status==='tentative')return (en?`The energy match is close, but support evidence is incomplete (${eligible}/${total} companions eligible); keep as tentative.`:`能量匹配较近，但支持证据不完整（${eligible}/${total} 条伴随线合格），因此仅为暂定候选。`)+suffix;
  if(candidate.status==='conflicting')return (en?`The line is retained within the ${tol} keV retrieval tolerance, but the evidence conflicts.`:`谱线保留在 ${tol} keV 候选容差内，但证据存在冲突。`)+suffix;
  return (en?`The database line is retained within the ${tol} keV retrieval tolerance, but current evidence is not support-eligible (${found}/${total} companion lines observed).`:`数据库线保留在 ${tol} keV 候选容差内，但当前证据不具支持资格（观察到伴随线 ${found}/${total}）。`)+suffix;
}

export function explainCandidate(candidate,toleranceKeV,lang='zh'){
  const companions=candidate.companions||[],found=companions.filter(x=>x.foundPeakId!=null).length;
  return candidateReason(candidate,found,companions.length,toleranceKeV,lang);
}
