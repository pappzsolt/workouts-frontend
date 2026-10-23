const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const languages = ['hu', 'en', 'de'];
const catalogDirectory = path.resolve(root, process.env.I18N_DIR || 'public/assets/i18n');
function flatten(value, prefix = '', result = {}) {
  for (const [key, text] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof text === 'string') result[fullKey] = text;
    else flatten(text, fullKey, result);
  }
  return result;
}
const catalogs = Object.fromEntries(languages.map(language => [language,
  flatten(JSON.parse(fs.readFileSync(path.join(catalogDirectory, `${language}.json`), 'utf8'))),
]));

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const name = path.join(directory, entry.name);
    return entry.isDirectory() ? files(name) : [name];
  });
}

test('all languages contain the same nonempty keys and interpolation parameters', () => {
  const keys = Object.keys(catalogs.hu).sort();
  for (const language of languages) {
    assert.deepEqual(Object.keys(catalogs[language]).sort(), keys, language);
    for (const key of keys) {
      assert.ok(catalogs[language][key].trim(), `${language}: ${key}`);
      const params = text => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map(match => match[1]).sort();
      assert.deepEqual(params(catalogs[language][key]), params(catalogs.hu[key]), `${language}: ${key}`);
    }
  }
});

test('literal translate pipe keys exist in every language', () => {
  for (const file of files(path.join(root, 'src/app'))) {
    if (!/\.(html|ts)$/.test(file) || file.endsWith('.spec.ts')) continue;
    for (const [, key] of fs.readFileSync(file, 'utf8').matchAll(/'([\w.]+)'\s*\|\s*translate/g)) {
      for (const language of languages) assert.ok(catalogs[language][key], `${language}: ${key} in ${file}`);
    }
  }
});

test('registration labels, hints, options and validation messages have Hungarian, English and German translations', () => {
  for (const name of ['register.component.html', 'register.component.ts']) {
    const source = fs.readFileSync(path.join(root, 'src/app/components/register', name), 'utf8');
    for (const [, key] of source.matchAll(/['"](register\.[\w.]+)['"]/g)) {
      for (const language of languages) assert.ok(catalogs[language][key], `${language}: ${key}`);
    }
  }
  assert.equal(catalogs.hu['register.title'], 'Regisztráció');
  assert.equal(catalogs.hu['register.submit'], 'Regisztráció elküldése');
});

if (process.env.I18N_DIR) {
  test('built translation catalogs match the source catalogs', () => {
    for (const language of languages) {
      const source = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/i18n', `${language}.json`), 'utf8'));
      assert.deepEqual(catalogs[language], flatten(source), `${language}: stale build translations`);
    }
  });
}
