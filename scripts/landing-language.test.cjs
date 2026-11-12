const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parse } = require('parse5');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/assets/seo/language.js'), 'utf8');

function page(saved = null, blockedStorage = false) {
  const tree = parse(fs.readFileSync(path.join(root, 'public/edzestervezo/index.html'), 'utf8'));
  const all = [];
  function visit(node) {
    all.push(node);
    Object.defineProperty(node, 'textContent', {
      get: () => node.value ?? (node.childNodes || []).map(child => child.textContent).join(''),
      set: value => { node.value = value; },
    });
    node.setAttribute = (name, value) => { node[name] = value; };
    for (const child of node.childNodes || []) visit(child);
  }
  visit(tree);
  const element = tag => all.find(node => node.tagName === tag);
  const selector = all.find(node => node.attrs?.some(attr => attr.name === 'id' && attr.value === 'landing-language'));
  let change;
  selector.addEventListener = (event, callback) => { assert.equal(event, 'change'); change = callback; };
  const queries = {
    '#landing-language': selector,
    '.site-header nav': all.filter(node => node.tagName === 'nav')[0],
    '.site-footer nav': all.filter(node => node.tagName === 'nav')[1],
    '.brand': all.find(node => node.attrs?.some(attr => attr.name === 'class' && attr.value === 'brand')),
  };
  const document = {
    body: element('body'), documentElement: element('html'), title: element('title').textContent,
    querySelector: query => { assert.ok(queries[query], query); return queries[query]; },
    createTreeWalker: () => {
      const texts = all.filter(node => node.nodeName === '#text');
      let index = -1;
      return { nextNode() { return !!texts[++index]; }, get currentNode() { return texts[index]; } };
    },
  };
  const localStorage = {
    getItem(key) { assert.equal(key, 'language'); if (blockedStorage) throw Error('blocked'); return saved; },
    setItem(key, value) { assert.equal(key, 'language'); if (blockedStorage) throw Error('blocked'); saved = value; },
  };
  vm.runInNewContext(source, { document, localStorage, NodeFilter: { SHOW_TEXT: 4 } });
  return { document, element, saved: () => saved, choose(language) { selector.value = language; change(); } };
}

test('language selection translates content and shares the application language preference', () => {
  const p = page();
  assert.match(p.element('h1').textContent, /edzéstervező/);
  for (const [lang, text] of [['en', 'Online workout planner'], ['de', 'Online-Trainingsplaner'], ['hu', 'Online edzéstervező']]) {
    p.choose(lang);
    assert.ok(p.element('h1').textContent.startsWith(text));
    assert.equal(p.document.documentElement.lang, lang);
    assert.equal(p.saved(), lang);
    assert.match(p.document.title, /Workouts/);
  }
  assert.match(page('de').element('h1').textContent, /Online-Trainingsplaner/);
});

test('invalid or unavailable storage falls back to Hungarian without breaking language selection', () => {
  assert.match(page('invalid').element('h1').textContent, /edzéstervező/);
  const p = page(null, true);
  p.choose('en');
  assert.match(p.element('h1').textContent, /Online workout planner/);
});
