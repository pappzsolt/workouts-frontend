import { expect, test } from '@playwright/test';
import { loginAs, setTestLanguage } from '../../../helpers/read-only';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('USER MOBILE GUI: dashboard actions are visible as a one-column mobile layout', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');
  const cards = page.locator('app-dashboard-action');
  await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) await expect(card).toBeVisible();
  const boxes = await cards.evaluateAll(els => els.map(e => { const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width}; }));
  expect(boxes[0].w).toBeGreaterThan(300);
  expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
  expect(boxes[2].y).toBeGreaterThan(boxes[1].y);
});
