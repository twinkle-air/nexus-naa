import {validatePlanForPrompt,parseModelPlan,ROUTER_SYSTEM_PROMPT} from './src/assistant.js';
export const modelProviders=['ollama','openai-compatible','anthropic','gemini'];
function validText(value,label,max=200){if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(`请指定有效的${label}。`);return value.trim()}
function config(provider,model,env){
  model=validText(model,'模型名',200);
  if(provider==='ollama')return {url:'http://127.0.0.1:11434/api/chat',headers:{'Content-Type':'application/json'},body:{model,stream:false,options:{temperature:0},format:'json',messages:[{role:'system',content:ROUTER_SYSTEM_PROMPT}]}};
  if(provider==='openai-compatible'){const base=validText(env.NAA_MODEL_BASE_URL,' NAA_MODEL_BASE_URL',1000).replace(/\/$/,'');const url=new URL(base.endsWith('/chat/completions')?base:`${base}/chat/completions`);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)))throw new Error('模型地址必须使用 HTTPS；本机 localhost 可使用 HTTP。');const key=validText(env.NAA_MODEL_API_KEY,' NAA_MODEL_API_KEY',1000);return {url:String(url),headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:{model,temperature:0,response_format:{type:'json_object'},messages:[{role:'system',content:ROUTER_SYSTEM_PROMPT}]}}}
  if(provider==='anthropic'){const key=validText(env.ANTHROPIC_API_KEY,' ANTHROPIC_API_KEY',1000);return {url:'https://api.anthropic.com/v1/messages',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},body:{model,max_tokens:120,temperature:0,system:ROUTER_SYSTEM_PROMPT,messages:[]}}}
  if(provider==='gemini'){const key=validText(env.GEMINI_API_KEY,' GEMINI_API_KEY',1000);return {url:`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,headers:{'Content-Type':'application/json','x-goog-api-key':key},body:{generationConfig:{temperature:0,responseMimeType:'application/json'},systemInstruction:{parts:[{text:ROUTER_SYSTEM_PROMPT}]},contents:[]}}}
  throw new Error('未支持的模型提供方。');
}
function addPrompt(provider,body,prompt){if(provider==='ollama'||provider==='openai-compatible'||provider==='anthropic')body.messages.push({role:'user',content:prompt});else body.contents.push({role:'user',parts:[{text:prompt}]});}
function outputText(provider,payload){if(provider==='ollama')return payload.message?.content;if(provider==='openai-compatible')return payload.choices?.[0]?.message?.content;if(provider==='anthropic')return payload.content?.find(x=>x.type==='text')?.text;return payload.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('');}
export async function modelPlan(prompt,model,provider='ollama',fetcher=fetch,env=process.env){
  prompt=validText(prompt,'问题',4000);if(!modelProviders.includes(provider))throw new Error('未支持的模型提供方。');const request=config(provider,model,env);addPrompt(provider,request.body,prompt);
  const response=await fetcher(request.url,{method:'POST',headers:request.headers,signal:AbortSignal.timeout(45000),body:JSON.stringify(request.body)});if(!response.ok)throw new Error(`${provider} 返回 HTTP ${response.status}。`);
  const payload=await response.json();const plan=validatePlanForPrompt(parseModelPlan(outputText(provider,payload)),prompt);return {plan,model,provider};
}
