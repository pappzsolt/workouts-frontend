const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const name of ['nginx.conf', 'nginx.runtime.conf']) {
  test(`${name}: homepage redirect preserves the browser origin, including mapped ports`, () => {
    const config = fs.readFileSync(path.join(__dirname, '../..', name), 'utf8');
    const location = config.match(/location\s+=\s+\/\s*\{([^}]+)\}/)?.[1];
    assert.ok(location, 'exact homepage location must exist');
    assert.match(location, /absolute_redirect\s+off\s*;/);
    assert.match(location, /return\s+302\s+\/edzestervezo\/\$is_args\$args\s*;/);

    const origin = 'http://192.168.1.37:8087';
    assert.equal(new URL('/edzestervezo/', origin).origin, origin);
  });
}
