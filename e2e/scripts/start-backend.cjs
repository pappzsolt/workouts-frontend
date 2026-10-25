const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const backend = resolve(process.env.E2E_BACKEND_DIR || '../../workouts-project');
const child = spawn('sh', [resolve(backend, 'scripts/start-live-api-tests.sh')], { cwd: backend, env: process.env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => process.exit(code ?? 1));
