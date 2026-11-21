'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');

function runFixture(edit) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'workouts-angular-preflight-'));
  try {
    const files = [
      'package.json', 'package-lock.json', 'angular.json', '.gitlab-ci.yml',
      'src/app/app.config.ts', 'scripts/angular-upgrade-preflight.cjs',
    ];
    for (const file of files) {
      const destination = path.join(temp, file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(root, file), destination);
    }
    if (edit) edit(temp);
    return spawnSync(process.execPath, [path.join(temp, 'scripts/angular-upgrade-preflight.cjs')], {
      encoding: 'utf8',
    });
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

test('Angular preflight supports the workspace-selected application builder', () => {
  const result = runFixture();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Angular migration preflight OK/);
});

test('Angular preflight still detects a missing required build package', () => {
  const result = runFixture(temp => {
    const file = path.join(temp, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    const angular = JSON.parse(fs.readFileSync(path.join(temp, 'angular.json'), 'utf8'));
    const builder = angular.projects['workouts-frontend'].architect.build.builder.split(':')[0];
    delete pkg.devDependencies[builder];
    delete pkg.dependencies[builder];
    fs.writeFileSync(file, JSON.stringify(pkg));
  });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /expected major 21/);
});
