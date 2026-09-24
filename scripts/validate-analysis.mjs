import {runToolCli,failCli} from './cli-tool.mjs';
runToolCli('nexus_validate_analysis').catch(failCli);
