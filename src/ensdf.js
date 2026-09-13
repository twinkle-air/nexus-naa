function numeric(field){const text=field.trim();return text&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?$/i.test(text)?Number(text):null}
export function ensdfNuclide(value){const m=String(value).trim().match(/^(\d+)([A-Z]{1,2})(M\d*)?$/);if(!m)return null;return `${m[2][0]}${m[2].slice(1).toLowerCase()}-${m[1]}${m[3]?m[3].toLowerCase():''}`}
export function parseEnsdf(text,{sourceUrl='',retrievedAt=new Date().toISOString().slice(0,10),sha256=''}={}){
  if(typeof text!=='string'||!text.trim())throw new Error('ENSDF 快照为空。');let dataset=null,parent=null,norm=null;const accepted=[],rejected=[],datasets=[];
  for(const [offset,raw] of text.split(/\r?\n/).entries()){const line=raw.padEnd(80),lineNumber=offset+1,type=line[7],continuation=line[5]!==' '||line[6]!==' ';
    if(!line.slice(5,9).trim()&&line.slice(9,39).trim()){dataset={daughter:ensdfNuclide(line.slice(0,5)),title:line.slice(9,39).trim(),reference:line.slice(39,65).trim(),rawDate:line.slice(65,80).trim(),lineNumber};parent=null;norm=null;datasets.push(dataset);continue}
    if(!dataset||continuation)continue;
    if(type==='P'){parent={nuclide:ensdfNuclide(line.slice(0,5)),energyRaw:line.slice(9,19).trim(),halfLifeRaw:line.slice(39,55).trim(),lineNumber};continue}
    if(type==='N'){norm={nr:numeric(line.slice(9,19)),dnrRaw:line.slice(19,21).trim(),br:numeric(line.slice(31,39)),dbrRaw:line.slice(39,41).trim(),lineNumber};continue}
    if(type!=='G')continue;
    const base={datasetTitle:dataset.title,datasetReference:dataset.reference,datasetDateRaw:dataset.rawDate,parentNuclide:parent?.nuclide||null,daughterNuclide:dataset.daughter,energyKeV:numeric(line.slice(9,19)),energyUncertaintyRaw:line.slice(19,21).trim(),relativeIntensity:numeric(line.slice(21,29)),intensityUncertaintyRaw:line.slice(29,31).trim(),normalization:norm,sourceUrl,sourceLine:lineNumber,retrievedAt,sourceSha256:sha256,rawRecord:raw};
    const reasons=[];if(!/DECAY/i.test(dataset.title))reasons.push('not_decay_dataset');if(!base.parentNuclide)reasons.push('missing_parent');if(base.energyKeV==null||base.energyKeV<=0)reasons.push('invalid_energy');if(base.relativeIntensity==null||base.relativeIntensity<0)reasons.push('invalid_relative_intensity');if(norm?.nr==null||norm?.br==null)reasons.push('missing_absolute_normalization');
    if(reasons.length)rejected.push({...base,qualification:'C',reasons});else accepted.push({...base,intensityPercent:base.relativeIntensity*norm.nr*norm.br,qualification:'B',verification:'ensdf_evaluated_decay_normalized',normalizationFormula:'RI*NR*BR'});
  }
  return {schemaVersion:'ensdf-staging-1',source:{name:'NNDC ENSDF',sourceUrl,retrievedAt,sha256},summary:{datasets:datasets.length,accepted:accepted.length,rejected:rejected.length},accepted,rejected};
}
