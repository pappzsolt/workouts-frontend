const fs = require('node:fs');
const path = require('node:path');
const config = require('../tailwind.config.js');

function auditTheme() {
  const colors = config.theme.extend.colors;
  const declared = new Set(['--app-shadow-color']);
  for (const [name, palette] of Object.entries(colors)) {
    if (typeof palette === 'string') declared.add(`--app-${name}`);
    else for (const shade of Object.keys(palette)) declared.add(`--app-${name}-${shade}`);
  }
  const errors = [];
  let files = 0;
  const root = path.resolve(__dirname, '../src');
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(file);
        continue;
      }
      // _old.css is an unreferenced legacy stylesheet; tests contain fixture colors.
      if (!/\.(css|html|ts)$/.test(file) || file.endsWith('.spec.ts') || file.endsWith('_old.css'))
        continue;
      files++;
      const text = fs.readFileSync(file, 'utf8');
      const relative = path.relative(root, file);
      for (const match of text.matchAll(/#[\da-f]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/gi)) {
        errors.push(`${relative}: hardcoded color ${match[0]}`);
      }
      for (const match of text.matchAll(/var\((--app-[\w-]+)/g)) {
        if (!declared.has(match[1])) errors.push(`${relative}: undefined ${match[1]}`);
      }
      for (const match of text.matchAll(
        /(?:bg|text|border|ring|from|via|to|shadow|accent|fill|stroke|outline|divide)-(primary|success|edit|info|search|add|save|surface|content|sort|pagination|warning|delete)-(\d+)/g,
      )) {
        if (!colors[match[1]]?.[match[2]])
          errors.push(`${relative}: undefined color ${match[1]}-${match[2]}`);
      }
      for (const match of text.matchAll(
        /(?:bg|text|border|ring|from|via|to|shadow|accent|fill|stroke|outline|divide)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black)(?:-\d+)?\b/g,
      )) {
        if (!colors[match[1]])
          errors.push(`${relative}: color outside the configured semantic palette ${match[0]}`);
      }
    }
  }
  walk(root);
  return { files, errors: [...new Set(errors)] };
}

module.exports = { auditTheme };
if (require.main === module) {
  const result = auditTheme();
  console.log(`Theme audit: ${result.files} source files, ${result.errors.length} errors.`);
  for (const error of result.errors) console.error(error);
  process.exitCode = result.errors.length ? 1 : 0;
}
