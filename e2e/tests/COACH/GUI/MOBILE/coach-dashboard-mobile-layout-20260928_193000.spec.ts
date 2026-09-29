import { expect, test } from '@playwright/test';
import { loginAs, setTestLanguage } from '../../../helpers/read-only';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('COACH MOBILE GUI: dashboard action cards form a usable one-column layout', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_COACH_USERNAME, process.env.E2E_COACH_PASSWORD, '/coach/dashboard');
  const actions = page.locator('app-dashboard-action');
  await expect(actions).toHaveCount(5);
  const boxes = await actions.evaluateAll(els => els.map(e => { const r=e.getBoundingClientRect(); return {y:r.y,w:r.width}; }));
  expect(boxes[0].w).toBeGreaterThan(300);
  for (let i=1;i<boxes.length;i++) expect(boxes[i].y).toBeGreaterThan(boxes[i-1].y);
  expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(391);
});
