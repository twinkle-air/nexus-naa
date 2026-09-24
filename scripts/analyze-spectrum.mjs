import {runToolCli,failCli} from './cli-tool.mjs';
runToolCli('nexus_analyze_spectrum').catch(failCli);
