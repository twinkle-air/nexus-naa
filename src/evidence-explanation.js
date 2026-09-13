export function candidateReason(candidate,found,total,toleranceKeV,lang='zh'){
  const en=lang==='en',delta=Math.abs(candidate.deltaKeV??0).toFixed(4),tol=Number(toleranceKeV??2).toFixed(4);
  if(candidate.status==='supported')return en?`Energy difference ${delta} keV is within the ${tol} keV tolerance and ${found}/${total} companion lines were observed.`:`能量差 ${delta} keV 位于 ${tol} keV 容差内，且观察到 ${found}/${total} 条伴随线。`;
  if(candidate.status==='tentative')return en?`The energy match is close, but companion-line evidence is absent or incomplete (${found}/${total}); keep as tentative.`:`能量匹配较近，但伴随线证据缺失或不完整（${found}/${total}），因此仅为暂定候选。`;
  if(candidate.status==='conflicting')return en?`The energy difference ${delta} keV is near the ${tol} keV tolerance boundary and no supporting companion line was observed.`:`能量差 ${delta} keV 接近 ${tol} keV 容差边缘，且未观察到支持性伴随线。`;
  return en?`The database line is energy-compatible within ${tol} keV, but current evidence is insufficient to support detection (${found}/${total} companion lines).`:`数据库线在 ${tol} keV 容差内能量相容，但当前证据不足以支持检出（伴随线 ${found}/${total}）。`;
}

export function explainCandidate(candidate,toleranceKeV,lang='zh'){
  const companions=candidate.companions||[],found=companions.filter(x=>x.foundPeakId!=null).length;
  return candidateReason(candidate,found,companions.length,toleranceKeV,lang);
}
