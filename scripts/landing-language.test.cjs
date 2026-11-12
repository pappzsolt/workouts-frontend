const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parse } = require('parse5');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('public/assets/seo/language.js');
const catalogs = Object.fromEntries(['hu', 'en', 'de'].map(language => [language,
  JSON.parse(read(`public/assets/i18n/${language}.json`)),
]));
const settle = () => new Promise(resolve => setImmediate(resolve));

function page({ saved = null, blockedStorage = false, fetchCatalog } = {}) {
  const tree = parse(read('public/edzestervezo/index.html'));
  const all = [];
  function visit(node) {
    all.push(node);
    Object.defineProperty(node, 'textContent', {
      get: () => node.value ?? (node.childNodes || []).map(child => child.textContent).join(''),
      set: value => { node.value = value; },
    });
    node.dataset = {};
    for (const { name, value } of node.attrs || []) {
      if (name === 'data-i18n') node.dataset.i18n = value;
      if (name === 'data-i18n-aria-label') node.dataset.i18nAriaLabel = value;
    }
    node.setAttribute = (name, value) => { node[name] = value; };
    for (const child of node.childNodes || []) visit(child);
  }
  visit(tree);
  const findId = id => all.find(node => node.attrs?.some(attr => attr.name === 'id' && attr.value === id));
  const selector = findId('landing-language');
  let change;
  selector.addEventListener = (event, callback) => { assert.equal(event, 'change'); change = callback; };
  const document = {
    documentElement: all.find(node => node.tagName === 'html'),
    querySelector: query => findId(query.slice(1)),
    querySelectorAll: query => all.filter(node => node.attrs?.some(attr => attr.name === query.slice(1, -1))),
  };
  const localStorage = {
    getItem(key) { assert.equal(key, 'language'); if (blockedStorage) throw Error('blocked'); return saved; },
    setItem(key, value) { assert.equal(key, 'language'); if (blockedStorage) throw Error('blocked'); saved = value; },
  };
  const requests = [];
  const fetch = async url => {
    requests.push(url);
    const language = url.match(/^\/assets\/i18n\/(hu|en|de)\.json$/)?.[1];
    assert.ok(language, url);
    return fetchCatalog ? fetchCatalog(language) : { ok: true, json: async () => catalogs[language] };
  };
  vm.runInNewContext(source, { document, localStorage, fetch });
  return {
    document, requests, selector, saved: () => saved,
    text: key => all.find(node => node.dataset.i18n === key).textContent,
    error: findId('landing-language-error'),
    choose(language) { selector.value = language; return change(); },
  };
}

test('language selection loads shared catalogs, updates content and saves the application preference', async () => {
  const p = page();
  await settle();
  for (const language of ['en', 'de', 'hu']) {
    await p.choose(language);
    assert.equal(p.text('landing.hero.title'), catalogs[language].landing.hero.title);
    assert.equal(p.text('landing.pageTitle'), catalogs[language].landing.pageTitle);
    assert.equal(p.document.documentElement.lang, language);
    assert.equal(p.saved(), language);
  }
  assert.deepEqual(p.requests, ['/assets/i18n/hu.json', '/assets/i18n/en.json', '/assets/i18n/de.json']);
  const restored = page({ saved: 'de' });
  await settle();
  assert.equal(restored.text('landing.hero.title'), catalogs.de.landing.hero.title);
});

test('invalid or unavailable storage falls back to Hungarian and still allows switching', async () => {
  const invalid = page({ saved: 'invalid' });
  await settle();
  assert.equal(invalid.document.documentElement.lang, 'hu');
  const p = page({ blockedStorage: true });
  await p.choose('en');
  assert.equal(p.text('landing.hero.title'), catalogs.en.landing.hero.title);
});

test('failed requests preserve the active language and can be retried', async () => {
  let fail = true;
  const p = page({ fetchCatalog: async language => ({
    ok: language !== 'de' || !fail, json: async () => catalogs[language],
  }) });
  await settle();
  await p.choose('de');
  assert.equal(p.selector.value, 'hu');
  assert.equal(p.saved(), 'hu');
  assert.equal(p.error.hidden, false);
  fail = false;
  await p.choose('de');
  assert.equal(p.saved(), 'de');
  assert.equal(p.error.hidden, true);
});

test('a slow earlier request cannot override the latest language selection', async () => {
  let finishEnglish;
  const p = page({ fetchCatalog: language => language === 'en'
    ? new Promise(resolve => { finishEnglish = resolve; })
    : Promise.resolve({ ok: true, json: async () => catalogs[language] }),
  });
  await settle();
  const english = p.choose('en');
  await p.choose('de');
  finishEnglish({ ok: true, json: async () => catalogs.en });
  await english;
  assert.equal(p.saved(), 'de');
  assert.equal(p.text('landing.hero.title'), catalogs.de.landing.hero.title);
});
