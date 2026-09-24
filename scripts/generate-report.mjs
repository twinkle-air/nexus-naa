import {runToolCli,failCli} from './cli-tool.mjs';
runToolCli('nexus_generate_report').catch(failCli);
