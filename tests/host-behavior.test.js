import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {evaluateHostBehavior} from '../src/host-eval.js';

const cases=JSON.parse(await readFile(new URL('./host-behavior-cases.json',import.meta.url),'utf8'));
const fixture=JSON.parse(await readFile(new URL('./fixtures/host-behavior-policy-fixture.json',import.meta.url),'utf8'));

test('six host-behavior scenarios pass the deterministic policy fixture',()=>{
  const result=evaluateHostBehavior(cases,fixture);
  assert.equal(result.summary.total,6);
  assert.equal(result.summary.passed,6,JSON.stringify(result.results));
});

test('host evaluator catches unsafe claims and stop-rule bypasses',()=>{
  const unsafe=structuredClone(fixture);
  unsafe.transcripts[0].actions.push({tool:'nexus_rank_nuclide_candidates'});
  unsafe.transcripts[0].finalText='已确认检出Co-60。';
  const result=evaluateHostBehavior(cases,unsafe),first=result.results[0];
  assert.equal(first.passed,false);
  assert.ok(first.failures.some(x=>x.startsWith('FORBIDDEN_TOOL')));
  assert.ok(first.failures.some(x=>x.startsWith('FORBIDDEN_CLAIM')));
});
