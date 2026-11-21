'use strict';

// Read-only Angular 19 -> 21 upgrade preflight. No network, npm install or file changes.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const angular = JSON.parse(read('angular.json'));
const appConfig = read('src/app/app.config.ts');
const dependency = (name) => pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
const majorOf = (value) => {
  const match = String(value ?? '').match(/\d+/);
  return match ? Number(match[0]) : null;
};
const majors = [
  '@angular/core', '@angular/common', '@angular/compiler', '@angular/forms',
  '@angular/platform-browser', '@angular/router', '@angular/cli',
  '@angular/compiler-cli', '@angular/cdk', '@angular/material',
];
const errors = [];
const core = majorOf(dependency('@angular/core'));
if (![19, 20, 21].includes(core)) errors.push(`This migration path expects Angular 19, 20 or 21; found ${dependency('@angular/core')}.`);
for (const name of majors) {
  const declared = dependency(name);
  const locked = lock.packages?.[`node_modules/${name}`]?.version;
  if (!declared || !locked) {
    errors.push(`Missing ${name} in package.json or package-lock.json.`);
    continue;
  }
  if (majorOf(declared) !== core || majorOf(locked) !== core) {
    errors.push(`${name}: declared ${declared}, locked ${locked}, expected major ${core}.`);
  }
}
if (!/provideZoneChangeDetection\s*\(/.test(appConfig)) {
  errors.push('App configuration must explicitly use provideZoneChangeDetection() to preserve Zone.js behavior in Angular 21.');
}
const project = angular.projects?.['workouts-frontend'];
if (!project) errors.push('Angular workspace does not contain workouts-frontend.');
// Angular 21's application builder comes from @angular/build, while older
// workspaces may still use @angular-devkit/build-angular. Check the package
// selected by angular.json rather than always requiring the legacy package.
const builder = project?.architect?.build?.builder ?? '';
const builderPackage = builder.split(':')[0];
if (!['@angular/build', '@angular-devkit/build-angular'].includes(builderPackage)) {
  errors.push(`Unexpected Angular build package in angular.json: ${builder || '(missing)'}.`);
} else {
  const declared = dependency(builderPackage);
  const locked = lock.packages?.[`node_modules/${builderPackage}`]?.version;
  if (!declared || !locked || majorOf(declared) !== core || majorOf(locked) !== core) {
    errors.push(`${builderPackage}: declared ${declared}, locked ${locked}, expected major ${core}.`);
  }
}
const buildPolyfills = project?.architect?.build?.options?.polyfills ?? [];
const testPolyfills = project?.architect?.test?.options?.polyfills ?? [];
if (!buildPolyfills.includes('zone.js') || !testPolyfills.includes('zone.js/testing')) {
  errors.push('Existing Zone.js build/test polyfills are missing.');
}
const nodeMajor = majorOf(process.versions.node);
const nodeMinor = Number(process.versions.node.split('.')[1]);
if (!(nodeMajor === 20 && nodeMinor >= 19) && !(nodeMajor === 22 && nodeMinor >= 12) && nodeMajor !== 24) {
  errors.push(`Node ${process.versions.node} is incompatible with Angular 21. Use Node >=22.12 (22.x), Node >=20.19 (20.x), or Node 24.x.`);
}
const tsDeclared = dependency('typescript');
const tsLocked = lock.packages?.['node_modules/typescript']?.version;
if (core === 21 && (majorOf(tsLocked) !== 5 || Number(tsLocked.split('.')[1]) < 9)) {
  errors.push(`Angular 21 requires TypeScript >=5.9 <6.0, found ${tsLocked}.`);
}
console.log(`Angular: declared ${dependency('@angular/core')}, locked ${lock.packages?.['node_modules/@angular/core']?.version}`);
console.log(`TypeScript: declared ${tsDeclared}, locked ${tsLocked}`);
console.log(`Node: ${process.versions.node}`);
console.log(`Zone.js: ${dependency('zone.js')}, explicit change detection: ${/provideZoneChangeDetection\s*\(/.test(appConfig)}`);
console.log(`Playwright CI job: ${/frontend-playwright:/.test(read('.gitlab-ci.yml')) ? 'present' : 'missing'}`);
if (errors.length) {
  console.error('Angular migration preflight FAILED:\n' + errors.map((x) => `- ${x}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Angular migration preflight OK (major ${core}). This does not replace npm ci, migrations or regression tests.`);
}
