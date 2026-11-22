const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const html = path => readFileSync(join(root, path), 'utf8');

const layout = 'src/app/layouts/default-layout/layout.component.html';
const breadcrumb = 'src/app/components/shared/components/dashboard-navigation/dashboard-navigation.component.html';

test('mobile header wraps its controls while retaining all actions', () => {
  const s = html(layout);
  for (const value of ['sm:flex-row', 'flex-col items-stretch', 'flex-wrap', '(buttonClick)="toggleMobileMenu()"', '(buttonClick)="onLogout()"', '<app-language-selector>']) {
    assert.ok(s.includes(value), value);
  }
});

test('breadcrumb retains router navigation and wraps on narrow devices', () => {
  const s = html(breadcrumb);
  assert.match(s, /mx-2.*sm:mx-6/);
  assert.match(s, /min-w-0 break-words rounded/);
  assert.match(s, /\[routerLink\]="link\(item\.url\)"/);
});

test('coach calendar phone toolbar reflows with its original actions', () => {
  const s = html('src/app/components/coach/coach-calendar/coach-calendar.component.html');
  assert.match(s, /grid-cols-\[auto_minmax\(0,1fr\)_auto\]/);
  assert.match(s, /col-span-3 w-full sm:w-auto/);
  for (const action of ['changeMonth(-1)', 'changeMonth(1)', 'goToToday()', 'selectDate(day.date)']) {
    assert.ok(s.includes(action), action);
  }
});

test('dense tables keep full columns in locally scrollable containers', () => {
  const tableFiles = [
    'src/app/components/user-dashboard/operations/personal-programs/personal-exercise-targets.component.html',
    'src/app/components/user-dashboard/operations/completed-program-history/completed-program-history.component.html',
    'src/app/components/coach/coach-client-detail/parts/client-exercise-sets.component.html',
    'src/app/components/admin-dashboard/operations/login-audit-logs/login-audit-logs.component.html',
    'src/app/components/admin-dashboard/operations/user-search/member-search.component.html',
  ];
  for (const file of tableFiles) {
    const s = html(file);
    assert.ok(s.includes('workouts-table-scroll'), file);
    assert.match(s, /overflow-x-auto/);
    assert.match(s, /tabindex="0"/);
    assert.match(s, /<table\b/);
  }
});

test('mobile inputs use readable font size, without hiding overall overflow', () => {
  const s = html('src/styles.css');
  assert.match(s, /@media \(max-width: 639px\)/);
  assert.match(s, /:is\(input:not\(\[type='checkbox'\]\):not\(\[type='radio'\]\), select, textarea\)\s*\{\s*font-size: 1rem;/);
  assert.doesNotMatch(s.slice(s.lastIndexOf('Mobile presentation only:')), /overflow-x:\s*hidden/);
});
