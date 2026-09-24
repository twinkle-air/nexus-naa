const matches=(text,pattern)=>new RegExp(pattern,'iu').test(text||'');

export function evaluateHostBehavior(caseSet,run){
  const transcriptById=new Map((run.transcripts||[]).map(item=>[item.caseId,item]));
  const results=caseSet.cases.map(testCase=>{
    const transcript=transcriptById.get(testCase.id),failures=[];
    if(!transcript)return {caseId:testCase.id,passed:false,failures:['MISSING_TRANSCRIPT']};
    const actions=(transcript.actions||[]).map(action=>action.tool),expected=testCase.expected;
    let cursor=-1;
    for(const tool of expected.requiredTools||[]){const index=actions.indexOf(tool,cursor+1);if(index<0)failures.push(`REQUIRED_TOOL_OR_ORDER:${tool}`);else cursor=index}
    for(const tool of expected.forbiddenTools||[])if(actions.includes(tool))failures.push(`FORBIDDEN_TOOL:${tool}`);
    if((transcript.questions||[]).length>(expected.maxQuestions??Infinity))failures.push('TOO_MANY_QUESTIONS');
    const questionText=(transcript.questions||[]).join('\n');
    for(const pattern of expected.requiredQuestion||[])if(!matches(questionText,pattern))failures.push(`QUESTION_MISSING:${pattern}`);
    for(const pattern of expected.requiredFinal||[])if(!matches(transcript.finalText,pattern))failures.push(`FINAL_MISSING:${pattern}`);
    for(const pattern of expected.forbiddenFinal||[])if(matches(transcript.finalText,pattern))failures.push(`FORBIDDEN_CLAIM:${pattern}`);
    if(expected.requireEvidenceId&&!(transcript.evidenceIds||[]).length)failures.push('EVIDENCE_ID_MISSING');
    return {caseId:testCase.id,passed:failures.length===0,failures,actions,questionCount:(transcript.questions||[]).length};
  });
  return {schemaVersion:caseSet.schemaVersion,run:run.run??null,summary:{passed:results.filter(x=>x.passed).length,total:results.length,passRate:results.length?results.filter(x=>x.passed).length/results.length:0},results};
}
