import test from 'node:test';
import assert from 'node:assert/strict';
import {sha256Hex} from '../src/sha256.js';
import {analysisFingerprint,stableJson} from '../src/validation.js';

test('SHA-256 implementation matches the FIPS standard vector',()=>{
  assert.equal(sha256Hex('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('analysis fingerprint is canonical, stable and mutation-sensitive',()=>{
  const a={schemaVersion:'0.4',softwareVersion:'1.3.0',source:{filename:'x',sha256:null},warnings:['a'],qc:{summary:{b:2,a:1}}};
  const b={qc:{summary:{a:1,b:2}},warnings:['a'],source:{sha256:null,filename:'x'},softwareVersion:'1.3.0',schemaVersion:'0.4'};
  assert.equal(stableJson(a),stableJson(b));
  assert.equal(analysisFingerprint(a),analysisFingerprint(b));
  assert.match(analysisFingerprint(a),/^sha256-[a-f0-9]{64}$/);
  b.warnings[0]='changed';
  assert.notEqual(analysisFingerprint(a),analysisFingerprint(b));
});
