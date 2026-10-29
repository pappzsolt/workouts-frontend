// Separate disposable database and short, genuine token/lock timeouts for HTTP tests.
const { spawn } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const backend = resolve(process.env.E2E_BACKEND_DIR || '../../workouts-project');
const cp = [resolve(backend, 'target/test-classes'), resolve(backend, 'target/classes'), readFileSync(resolve(backend, 'target/live-api-classpath.txt'), 'utf8').trim()].join(':');
const child = spawn('java', ['-cp', cp, 'com.workouts.workouts.testsupport.LiveApiTestServer'], { cwd: backend, stdio: 'inherit', env: { ...process.env,
  LIVE_API_PORT: '8100', LIVE_API_DESCRIPTOR: 'target/live-auth-environment.json', LIVE_API_SETTINGS: JSON.stringify({
    'jwt.web-access-ttl-ms': '10000', 'jwt.mobile-access-ttl-ms': '10000', 'jwt.refresh-ttl-ms': '20000',
    'app.auth.login-protection.account-max-failures': '3', 'app.auth.login-protection.ip-max-failures': '1000',
    'app.auth.login-protection.block-seconds': '2', 'app.auth.login-protection.window-seconds': '2',
    'app.password-reset.outbox.initial-retry-delay-seconds': '1', 'app.password-reset.outbox.max-retry-delay-seconds': '2',
  }) } });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; }); child.on('exit', code => process.exit(code ?? 1));
