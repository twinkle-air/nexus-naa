import {readFile} from 'node:fs/promises';
import {executeAgentTool} from '../agent-tools.mjs';

async function readStdin(){let text='';for await(const chunk of process.stdin)text+=chunk;return text}

export async function runToolCli(toolName,inputPath=process.argv[2]){
  if(!toolName)throw new Error('缺少工具名。');
  const text=inputPath?await readFile(inputPath,'utf8'):await readStdin();
  if(!text.trim())throw new Error('请通过 JSON 文件或标准输入提供工具参数。');
  const result=await executeAgentTool(toolName,JSON.parse(text));
  process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
}

export function failCli(error){process.stderr.write(`${error.code||'ERROR'}: ${error.message}\n`);process.exitCode=1}
