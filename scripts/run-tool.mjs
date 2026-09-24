import {runToolCli,failCli} from './cli-tool.mjs';
const [toolName,inputPath]=process.argv.slice(2);
runToolCli(toolName,inputPath??null).catch(failCli);
