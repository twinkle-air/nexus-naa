import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import {fileURLToPath} from 'node:url';
import {modelPlan} from './model.mjs';
import {agentTools,executeAgentTool} from './agent-tools.mjs';
import {importSpreadsheet} from './file-import.mjs';

const root = fileURLToPath(new URL('.',import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".csv": "text/csv; charset=utf-8", ".md": "text/markdown; charset=utf-8" };
async function readJson(req,limit){let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>limit)throw new Error('请求过大');}return JSON.parse(body||'{}')}
async function readBytes(req,limit){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw new Error('文件超过 20 MB 限制');chunks.push(chunk)}return Buffer.concat(chunks)}

createServer(async (req, res) => {
  try {
    if(req.url==='/api/import/spreadsheet'&&req.method==='POST'){
      if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403);return res.end();}
      try{const filename=decodeURIComponent(String(req.headers['x-filename']||''));const converted=await importSpreadsheet(await readBytes(req,20_000_000),filename);res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify(converted));}catch(e){res.writeHead(400,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:e.message}));}
    }
    if(req.url==='/api/v1/tools'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({version:'0.4.0',tools:agentTools}));}
    if(req.url?.startsWith('/api/v1/tools/')&&req.method==='POST'){
      if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403);return res.end();}
      try{const name=decodeURIComponent(req.url.slice('/api/v1/tools/'.length));const limit=name==='nexus_import_spectrum'?27_000_000:10_500_000,result=await executeAgentTool(name,await readJson(req,limit));res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify(result));}catch(e){res.writeHead(400,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:e.message}));}
    }
    if(req.url==='/api/assistant' && req.method==='POST'){
      if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403);return res.end();}
      try{const {prompt,model,provider}=await readJson(req,20000);const result=await modelPlan(prompt,model,provider);res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify(result));}catch(e){res.writeHead(503,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:`模型调用失败：${e.message} 请检查服务端配置，或切换离线/手动验证。`}));}
    }
    if(req.method!=='GET' && req.method!=='HEAD')throw new Error('Unsupported method');
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    if(!/^(index\.html|styles\.css|analysis\.css|assistant\.css|light-theme\.css|src\/[a-z0-9-]+\.js|data\/[a-zA-Z0-9_.-]+|docs\/[a-zA-Z0-9_.-]+)$/.test(relative))throw new Error('Forbidden');
    const file = normalize(join(root, relative));
    if (!file.startsWith(root)) throw new Error("Forbidden");
    if (!(await stat(file)).isFile()) throw new Error("Not found");
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`Nexus-NAA: http://127.0.0.1:${port}`));
