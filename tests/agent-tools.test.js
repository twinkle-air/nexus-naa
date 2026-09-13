import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {executeAgentTool} from '../agent-tools.mjs';
import {syntheticDemo} from '../src/demo.js';
test('agent analysis API uses the same evidence workflow',async()=>{const out=await executeAgentTool('nexus_analyze_spectrum',{spectrumText:syntheticDemo(),filename:'agent-synthetic.csv',calibrationText:'0,0\n1500,1500'});assert.equal(out.summary.peakCount,2);assert.ok(out.summary.candidates.every(x=>x.candidates.some(c=>c.nuclide==='Co-60'&&c.status==='supported')));assert.match(out.result.source.sha256,/^[a-f0-9]{64}$/);});
test('agent query remains candidate-only',async()=>{const out=await executeAgentTool('nexus_query_gamma',{energyKeV:661.657,toleranceKeV:0.1});assert.match(out.summary,/不构成测量检出结论/);assert.equal(out.query.rows[0].nuclide,'Cs-137');});
test('agent file import normalizes text spectrum',async()=>{const out=await executeAgentTool('nexus_import_spectrum',{filename:'sample.spe',fileText:'$DATA:\n0 2\n1\n5\n1'});assert.match(out.spectrumText,/\$DATA/);assert.equal(out.converter,'text')});
test('MCP stdio initializes, lists and calls tools',async()=>{
  const child=spawn(process.execPath,['mcp-server.mjs'],{cwd:new URL('..',import.meta.url),stdio:['pipe','pipe','pipe']});let output='';child.stdout.setEncoding('utf8');child.stdout.on('data',x=>output+=x);
  const messages=[{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'1'}}},{jsonrpc:'2.0',method:'notifications/initialized'},{jsonrpc:'2.0',id:2,method:'tools/list'},{jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'nexus_query_gamma',arguments:{energyKeV:661.657,toleranceKeV:.1}}}];
  for(const m of messages)child.stdin.write(JSON.stringify(m)+'\n');child.stdin.end();await new Promise((resolve,reject)=>{child.on('exit',code=>code===0?resolve():reject(new Error(`MCP exit ${code}`)));child.on('error',reject)});
  const rows=output.trim().split('\n').map(JSON.parse);assert.equal(rows[0].result.serverInfo.name,'nexus-naa');assert.equal(rows[1].result.tools.length,4);assert.equal(rows[2].result.isError,false);assert.equal(rows[2].result.structuredContent.query.rows[0].nuclide,'Cs-137');
});
