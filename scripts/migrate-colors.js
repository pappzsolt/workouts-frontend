const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('src/app');
const REPORT = '/tmp/workouts-color-migration-dry-run.txt';

// Első körben csak ezek a pontos osztályok migrálhatók.
const replacements = {
  'text-slate-700': 'text-content-700',
  'text-slate-800': 'text-content-800',
  'text-slate-600': 'text-content-600',
  'text-slate-500': 'text-content-500',
  'text-slate-400': 'text-content-400',
  'text-slate-900': 'text-content-900',

  'border-slate-200': 'border-surface-200',
  'border-slate-300': 'border-surface-300',
  'border-slate-100': 'border-surface-100',

  'bg-slate-50': 'bg-surface-50',
  'bg-slate-100': 'bg-surface-100',

  'placeholder:text-slate-400':
    'placeholder:text-content-400',
};

// Alapértelmezés: dry-run.
// Tényleges módosítás csak --apply argumentummal.
const APPLY = process.argv.includes('--apply');

const files = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, {
    withFileTypes: true,
  })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.html')
    ) {
      files.push(fullPath);
    }
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Csak teljes Tailwind osztályt cserélünk.
// A hover:, focus:, disabled: stb. variánsokat kihagyjuk.
function replaceExactClass(content, oldClass, newClass) {
  const escaped = escapeRegExp(oldClass);

  const regex = new RegExp(
    `(^|[\\s"'\\x60])${escaped}(?=[\\s"'\\x60])`,
    'g'
  );

  return content.replace(
    regex,
    (_, prefix) => `${prefix}${newClass}`
  );
}

walk(ROOT);

const report = [];
const totals = new Map();
let changedFiles = 0;

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  let updated = original;

  for (const [oldClass, newClass] of Object.entries(
    replacements
  )) {
    const before = updated;

    updated = replaceExactClass(
      updated,
      oldClass,
      newClass
    );

    if (updated !== before) {
      const count = (
        before.match(
          new RegExp(
            `(^|[\\s"'\\x60])${escapeRegExp(oldClass)}(?=[\\s"'\\x60])`,
            'g'
          )
        ) || []
      ).length;

      totals.set(
        oldClass,
        (totals.get(oldClass) || 0) + count
      );

      report.push(
        `${path.relative(process.cwd(), file)}: ` +
        `${oldClass} -> ${newClass}`
      );
    }
  }

  if (updated !== original) {
    changedFiles++;

    if (APPLY) {
      fs.writeFileSync(file, updated, 'utf8');
    }
  }
}

const totalReplacements = [...totals.values()]
  .reduce((sum, count) => sum + count, 0);

const output = [
  'TAILWIND COLOR MIGRATION',
  `Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`,
  `HTML files scanned: ${files.length}`,
  `Files to change/changed: ${changedFiles}`,
  `Total replacements: ${totalReplacements}`,
  '',
  '=== REPLACEMENTS BY CLASS ===',
  ...[...totals.entries()].map(
    ([oldClass, count]) =>
      `${count}\t${oldClass} -> ${replacements[oldClass]}`
  ),
  '',
  '=== FILES ===',
  ...report,
  '',
  APPLY
    ? 'Changes applied.'
    : 'DRY-RUN ONLY: no source files were modified.',
].join('\n');

fs.writeFileSync(REPORT, output);

console.log(output);
console.log(`\nReport saved to: ${REPORT}`);
