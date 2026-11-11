const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('parse5');

const root = path.resolve(__dirname, '..');
const publicRoot = path.resolve(root, process.env.SEO_PUBLIC_DIR || 'public');
const read = name => fs.readFileSync(path.join(publicRoot, name), 'utf8');
const html = read('edzestervezo/index.html');
const tree = parse(html);
const nodes = (node, tag) => [ ...(node.tagName === tag ? [node] : []),
  ...(node.childNodes || []).flatMap(child => nodes(child, tag)) ];
const attr = (node, name) => node.attrs?.find(attribute => attribute.name === name)?.value;
const content = node => node.value || (node.childNodes || []).map(content).join('');
const metadata = (name, key = 'name') => attr(nodes(tree, 'meta').find(node => attr(node, key) === name), 'content');
const canonical = attr(nodes(tree, 'link').find(node => attr(node, 'rel') === 'canonical'), 'href');

test('the introduction is useful HTML without Angular or executable JavaScript', () => {
  assert.equal(attr(nodes(tree, 'html')[0], 'lang'), 'hu');
  assert.equal(nodes(tree, 'h1').length, 1);
  assert.match(content(nodes(tree, 'h1')[0]), /edzéstervező és edzésnapló/i);
  assert.ok(nodes(tree, 'h2').length >= 4);
  assert.ok(content(nodes(tree, 'main')[0]).trim().length > 2000);
  assert.equal(nodes(tree, 'app-root').length, 0);
  assert.ok(nodes(tree, 'script').every(node => attr(node, 'type') === 'application/ld+json'));
  assert.match(content(nodes(tree, 'main')[0]), /adminisztrátori jóváhagyás/);
});

test('title, canonical, social URL and sitemap describe the same indexable page', () => {
  assert.equal(content(nodes(tree, 'title')[0]), 'Workouts – Online edzéstervező és edzésnapló');
  const description = metadata('description');
  assert.ok(description.length >= 100 && description.length <= 180);
  assert.equal(canonical, 'https://workouts.hevexora.com/edzestervezo/');
  assert.equal(metadata('og:url', 'property'), canonical);
  assert.match(metadata('robots'), /^index, follow/);
  const urls = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(urls, [canonical]);
  assert.match(read('sitemap.xml'), /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
});

test('structured data is valid JSON and agrees with the visible application and canonical URL', () => {
  const data = JSON.parse(content(nodes(tree, 'script')[0]));
  assert.equal(data['@context'], 'https://schema.org');
  for (const type of ['WebSite', 'WebPage', 'WebApplication']) {
    const entity = data['@graph'].find(entity => entity['@type'] === type);
    assert.ok(entity, type);
    assert.equal(entity.url, canonical);
  }
  assert.equal(data['@graph'].find(entity => entity['@type'] === 'WebApplication').name, 'Workouts');
});

test('robot rules expose the sitemap and leave HTML and required assets crawlable', () => {
  const rules = read('robots.txt');
  assert.match(rules, /^User-agent: \*/m);
  assert.match(rules, /^Sitemap: https:\/\/workouts.hevexora.com\/sitemap.xml$/m);
  const blocked = [...rules.matchAll(/^Disallow:\s*(.*)$/gm)].map(match => match[1].trim());
  for (const url of ['/edzestervezo/', '/login', '/register', '/reset-password', '/user/profile', '/assets/seo/workouts.css']) {
    assert.ok(!blocked.some(prefix => prefix && url.startsWith(prefix)), `${url} must be crawlable`);
  }
});

test('existing forms stay out of search even before JavaScript runs', () => {
  const source = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
  const application = parse(source);
  const robots = nodes(application, 'meta').find(node => attr(node, 'name') === 'robots');
  assert.equal(attr(robots, 'content'), 'noindex, follow');
  assert.match(source, /href="\/edzestervezo\/"/);
});

test('introduction links keep login and registration accessible and its local assets exist', () => {
  const links = nodes(tree, 'a').map(node => attr(node, 'href'));
  for (const destination of ['/login', '/register', '/delete-account']) assert.ok(links.includes(destination));
  for (const node of nodes(tree, 'link').filter(node => ['stylesheet', 'preload'].includes(attr(node, 'rel')))) {
    const asset = attr(node, 'href');
    assert.ok(asset.startsWith('/assets/'));
    assert.ok(fs.existsSync(path.join(publicRoot, asset.slice(1))), asset);
  }
  // Unknown links must not silently fall through to the Angular wildcard redirect.
  for (const destination of links.filter(link => link.startsWith('#'))) {
    assert.ok(html.includes(`id="${destination.slice(1)}"`), destination);
  }
});
