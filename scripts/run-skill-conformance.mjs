import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const result=spawnSync(process.execPath,['--test','tests/skill-conformance.test.js'],{cwd:root,stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
