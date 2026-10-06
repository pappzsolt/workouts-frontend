const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const tailwind = require('tailwindcss');
const config = require('../tailwind.config.js');
const resolveConfig = require('tailwindcss/resolveConfig');
const { auditTheme } = require('./check-theme.cjs');

const source = fs.readFileSync(path.resolve(__dirname, '../src/styles.css'), 'utf8');
const compile = (themeConfig) =>
  postcss([tailwind(themeConfig)]).process(source, { from: undefined });
const declaration = (css, name) => {
  let value;
  css.walkDecls(name, (decl) => {
    value = decl.value;
  });
  return value;
};

test('all application colors reference the configured palette', () => {
  const result = auditTheme();
  assert.ok(result.files > 300);
  assert.deepEqual(result.errors, []);
});

test('the global stylesheet compiles and exports every semantic shade', async () => {
  const result = await compile(config);
  assert.ok(!result.css.includes('theme('));
  for (const [name, palette] of Object.entries(config.theme.extend.colors)) {
    if (typeof palette === 'string') {
      assert.equal(
        declaration(result.root, `--app-${name === 'shadow' ? 'shadow-color' : name}`),
        palette,
      );
    } else {
      for (const [shade, color] of Object.entries(palette)) {
        assert.equal(declaration(result.root, `--app-${name}-${shade}`), color);
      }
    }
  }
  assert.equal(declaration(result.root, '--mat-sys-primary'), 'var(--app-primary-600)');
  assert.equal(declaration(result.root, '--mat-sys-surface'), 'var(--app-white)');
  assert.equal(declaration(result.root, '--mat-sys-error'), 'var(--app-delete-600)');
});

test('changing only the config propagates to utilities, CSS variables and new shades', async () => {
  const colors = config.theme.extend.colors;
  const updated = {
    ...config,
    content: [
      { raw: '<div class="bg-primary-600 text-info-600 bg-white"></div>', extension: 'html' },
    ],
    theme: {
      ...config.theme,
      extend: {
        ...config.theme.extend,
        colors: {
          ...colors,
          primary: { ...colors.primary, 600: '#123456', 950: '#102030' },
          info: { ...colors.info, 600: '#654321' },
          white: '#FEFEFE',
          overlay: '#112233',
          shadow: '#334455',
        },
      },
    },
  };
  const resolved = resolveConfig(updated);
  assert.equal(resolved.theme.ringColor.DEFAULT, updated.theme.extend.colors.primary[500]);
  assert.equal(resolved.theme.ringOffsetColor.DEFAULT, '#FEFEFE');
  assert.equal(resolved.theme.borderColor.DEFAULT, updated.theme.extend.colors.surface[300]);
  const result = await compile(updated);
  assert.equal(declaration(result.root, '--app-primary-600'), '#123456');
  assert.equal(declaration(result.root, '--app-primary-950'), '#102030');
  assert.equal(declaration(result.root, '--app-info-600'), '#654321');
  assert.equal(declaration(result.root, '--app-white'), '#FEFEFE');
  assert.equal(declaration(result.root, '--app-overlay'), '#112233');
  assert.equal(declaration(result.root, '--app-shadow-color'), '#334455');
  const backgrounds = [];
  result.root.walkRules('.bg-primary-600', (rule) =>
    rule.walkDecls('background-color', (decl) => backgrounds.push(decl.value)),
  );
  assert.ok(backgrounds.some((value) => value.includes('18 52 86')));
});
