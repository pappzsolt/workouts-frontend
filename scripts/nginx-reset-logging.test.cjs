const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

for (const config of ['nginx.conf', 'nginx.runtime.conf']) {
  test(`${config}: reset page excludes credentials from local access and referrer logs`, () => {
    const source = readFileSync(join(__dirname, '..', config), 'utf8');
    assert.match(source, /if\s*\(\$request_uri\s*~\*\s*"\^\/reset-password/);
    assert.match(source, /access_log\s+\/var\/log\/nginx\/access\.log\s+combined\s+if=\$workouts_access_log;/);
    assert.match(source, /location\s*=\s*\/reset-password\s*\{([\s\S]*?)\n\s*\}/);
    const block = source.match(/location\s*=\s*\/reset-password\s*\{([\s\S]*?)\n\s*\}/)[1];
    assert.match(block, /access_log\s+off;/);
    assert.match(block, /try_files\s+\/index\.html\s+=404;/);
    assert.match(block, /add_header\s+Referrer-Policy\s+"no-referrer"\s+always;/);
    assert.match(block, /add_header\s+Content-Security-Policy/);
  });
}
