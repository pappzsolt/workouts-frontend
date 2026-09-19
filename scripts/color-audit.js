const fs = require('fs');
const path = require('path');

const config = require('../tailwind.config.js');

const palettes = Object.keys(
  config.theme?.extend?.colors || {}
);

const ROOT = path.resolve('src/app');
const REPORT = '/tmp/workouts-color-dry-run.txt';

const colorRegex =
  /(?:^|[\s"'`])((?:[a-z-]+:)*(?:bg|text|border|ring|from|to|via|outline|decoration|placeholder)-([a-z]+)-[0-9]{1,3}(?:\/[0-9]+)?)/g;

const files = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
}

walk(ROOT);

const results = [];
const totals = new Map();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');

  for (const match of content.matchAll(colorRegex)) {
    const className = match[1];
    const palette = match[2];

    if (palettes.includes(palette)) continue;

    const line = content.slice(0, match.index).split('\n').length;

    results.push({
      file: path.relative(process.cwd(), file),
      line,
      className,
    });

    totals.set(className, (totals.get(className) || 0) + 1);
  }
}

results.sort((a, b) =>
  a.file.localeCompare(b.file) || a.line - b.line
);

const output = [
  'TAILWIND COLOR DRY-RUN AUDIT',
  `HTML files scanned: ${files.length}`,
  `Central palettes preserved: ${palettes.join(', ')}`,
  `Non-central color occurrences: ${results.length}`,
  `Unique non-central classes: ${totals.size}`,
  '',
  '=== OCCURRENCES BY FILE ===',
  ...results.map(
    r => `${r.file}:${r.line}  ${r.className}`
  ),
  '',
  '=== SUMMARY BY CLASS ===',
  ...[...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${count}\t${name}`),
  '',
  'DRY-RUN ONLY: no source files were modified.',
].join('\n');

fs.writeFileSync(REPORT, output);

console.log(output);
console.log(`\nReport saved to: ${REPORT}`);
