import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Workspace} from '../src/workflow.js';
import {syntheticDemo} from '../src/demo.js';
import {htmlReport} from '../src/report.js';
const db=JSON.parse(await readFile(new URL('../data/nuclear-lines.json',import.meta.url),'utf8'));
test('UI fixture connects all four stages with exact data citations',()=>{
  const w=new Workspace(db);w.load(syntheticDemo(),'SYNTHETIC-Co60-validation.csv');
  const result=w.analyze({calibrationText:'0,0\n1500,1500'});
  assert.equal(result.peaks.length,2);
  assert.ok(result.matching.every(m=>m.candidates.some(c=>c.nuclide==='Co-60'&&c.status==='supported')));
  const records=result.evidence.evidence.filter(e=>e.type==='nuclear_data');
  assert.ok(records.length>0);assert.ok(records.every(e=>e.recordId&&e.sourceUrl.includes('#page=')));
  assert.match(htmlReport(result),/SYNTHETIC/);
});
test('zero-peak matching still validates invalid tolerance',()=>{
  const w=new Workspace(db);w.load('0,0\n1,0\n2,0','zeros.csv');w.calibrate('0,0\n2,2');w.search();
  assert.throws(()=>w.match({toleranceKeV:-1,topN:3}));assert.equal(w.matches,null);
});
test('UI exposes a browsable nuclear-data table and evidence tooltips',async()=>{
  const [html,app]=await Promise.all([
    readFile(new URL('../index.html',import.meta.url),'utf8'),
    readFile(new URL('../src/app.js',import.meta.url),'utf8')
  ]);
  assert.match(html,/id="databaseDialog"/);
  assert.match(html,/id="databaseRows"/);
  assert.match(app,/renderDatabaseTable/);
  assert.match(app,/data-tooltip=/);
  assert.match(app,/candidateReason/);
});
