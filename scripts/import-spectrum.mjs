import {runToolCli,failCli} from './cli-tool.mjs';
runToolCli('nexus_import_spectrum').catch(failCli);
