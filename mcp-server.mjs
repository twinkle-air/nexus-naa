import {createInterface} from 'node:readline';
import {agentTools,executeAgentTool} from './agent-tools.mjs';
const protocolVersion='2025-06-18';
function send(value){process.stdout.write(JSON.stringify(value)+'\n')}
async function handle(message){
  if(message.jsonrpc!=='2.0'||message.id===null)throw new Error('无效 JSON-RPC 消息。');
  if(message.method==='initialize'){send({jsonrpc:'2.0',id:message.id,result:{protocolVersion,capabilities:{tools:{}},serverInfo:{name:'nexus-naa',version:'0.4.0'},instructions:'仅输出候选证据；不得把数据库命中表述为确认检出。标定点必须来自用户或实验。'}});return}
  if(message.method==='ping'){send({jsonrpc:'2.0',id:message.id,result:{}});return}
  if(message.method==='tools/list'){send({jsonrpc:'2.0',id:message.id,result:{tools:agentTools}});return}
  if(message.method==='tools/call'){try{const data=await executeAgentTool(message.params?.name,message.params?.arguments);send({jsonrpc:'2.0',id:message.id,result:{content:[{type:'text',text:JSON.stringify(data.summary,null,2)}],structuredContent:data,isError:false}})}catch(error){send({jsonrpc:'2.0',id:message.id,result:{content:[{type:'text',text:error.message}],isError:true}})}return}
  send({jsonrpc:'2.0',id:message.id,error:{code:-32601,message:'Method not found'}});
}
const input=createInterface({input:process.stdin,crlfDelay:Infinity});
input.on('line',async line=>{if(Buffer.byteLength(line)>10_500_000){send({jsonrpc:'2.0',id:0,error:{code:-32600,message:'Request too large'}});return}try{const message=JSON.parse(line);if(message.id===undefined)return;await handle(message)}catch(error){send({jsonrpc:'2.0',id:0,error:{code:-32700,message:error.message}})}});
