import { type Page } from '@playwright/test';
import { test, expect, loginAccount } from '../../helpers/p1-fixture';
import { apiFor, closeDb, db, dbOne, login, success } from '../../helpers/e2e-next-3-helpers';

test.describe.configure({ timeout: 120_000 });
test.afterAll(closeDb);

async function pixels(page: Page, png: Buffer) {
  return page.evaluate(async bytes => {
    const image = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, image.width, image.height).data;
    const digest = await crypto.subtle.digest('SHA-256', data);
    image.close();
    return { width: canvas.width, height: canvas.height, hash: Array.from(new Uint8Array(digest)).map(v => v.toString(16).padStart(2, '0')).join('') };
  }, Array.from(png));
}

test('BUG REPORT LIVE: actual screenshot upload → exact DB report → admin pixels and reload; non-admin access denied', async ({ page, account }) => {
  const owner = await loginAccount(page, account);
  const title = `${account.username} <img src=x onerror=alert(1)>`;
  const description = 'A mentés után nem frissült a naptár.\n<script>alert(2)</script>';
  const reportIds: number[] = [];
  let dialog = false;
  page.on('dialog', async d => { dialog = true; await d.dismiss(); });
  try {
    await page.goto('/user/profile');
    await page.getByRole('link', { name: 'Hibabejelentés', exact: true }).click();
    await expect(page.locator('#bug-page')).toHaveValue('/user/profile');
    await page.locator('#bug-title').fill(title);
    await page.locator('#bug-description').fill(description);
    const screenshot = await page.screenshot();
    const originalPixels = await pixels(page, screenshot);
    await page.locator('#bug-screenshots').setInputFiles({ name: 'calendar-error.png', mimeType: 'image/png', buffer: screenshot });
    await expect(page.getByRole('img', { name: 'calendar-error.png', exact: true })).toBeVisible();
    const pending = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/bug-reports');
    await page.getByRole('button', { name: 'Bejelentés elküldése', exact: true }).click();
    const response = await pending;
    expect(response.status()).toBe(201);
    const submitted = await response.json(); expect(submitted.success).toBe(true);
    const id = Number(submitted.data.id); reportIds.push(id);
    expect(submitted.data.screenshots).toBe(1);
    await expect(page.getByText(`#${id}`, { exact: true })).toBeVisible();
    const stored = await dbOne('SELECT * FROM bug_reports WHERE id=$1', [id]);
    expect(stored).toMatchObject({ reporter_type: 'USER', reporter_user_id: account.id, reporter_name: account.username,
      reporter_email: account.email, title, description, page_url: '/user/profile' });
    expect(new Date(stored.created_at).getTime()).toBe(Date.parse(submitted.data.createdAt));
    const images = (await db().query('SELECT * FROM bug_report_screenshots WHERE bug_report_id=$1 ORDER BY position', [id])).rows;
    expect(images).toHaveLength(1);
    const image = images[0];
    expect(image).toMatchObject({ position: 1, content_type: 'image/png', width: originalPixels.width, height: originalPixels.height });
    expect(image.size_bytes).toBe(image.data.length);
    expect(await pixels(page, image.data)).toEqual(originalPixels);
    for (const path of ['/api/admin/bug-reports', `/api/admin/bug-reports/${id}`, `/api/admin/bug-reports/${id}/screenshots/${image.id}`]) {
      const denied = await owner.get(path);
      expect(denied.status(), path).toBe(403); expect((await denied.json()).success).toBe(false);
    }
    const second = await success(await owner.post('/api/bug-reports', { multipart: {
      title: `${account.username} unrelated report`, description: 'Másik bejelentés, saját képernyőkép nélkül.', pageUrl: '/user/workouts',
    } }), 'Create a distinct report to verify image/report association');
    const secondId = Number(second.data.id); reportIds.push(secondId);

    await login(page, 'admin'); const admin = await apiFor(page);
    try {
      const path = `/api/admin/bug-reports/${id}/screenshots/${image.id}`;
      const downloaded = await admin.get(path);
      expect(downloaded.status()).toBe(200); expect(downloaded.headers()['content-type']).toContain('image/png');
      expect(await downloaded.body()).toEqual(image.data);
      expect(await pixels(page, await downloaded.body())).toEqual(originalPixels);
      const mismatch = await admin.get(`/api/admin/bug-reports/${secondId}/screenshots/${image.id}`);
      expect(mismatch.status()).toBe(404); expect((await mismatch.json()).success).toBe(false);
      await page.getByRole('link', { name: 'Hibabejelentések', exact: true }).click();
      const item = page.getByRole('listitem', { name: title, exact: true });
      await expect(item.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await expect(item).toContainText(account.username); await expect(item).toContainText(account.email);
      await expect(item).toContainText(description); await expect(item).toContainText('/user/profile');
      const thumb = item.getByRole('img', { name: '1. képernyőkép', exact: true });
      await expect.poll(() => thumb.evaluate((img: HTMLImageElement) => ({ width: img.naturalWidth, height: img.naturalHeight }))).toEqual({ width: image.width, height: image.height });
      await item.getByRole('button', { name: '1. képernyőkép megnyitása', exact: true }).click();
      await expect(page.getByRole('dialog').getByRole('img')).toBeVisible();
      await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
      const reloaded = page.waitForResponse(r => r.request().method() === 'GET' && new URL(r.url()).pathname === path);
      await page.reload(); expect((await reloaded).status()).toBe(200);
      await expect(item.getByRole('heading', { name: title, exact: true })).toBeVisible();
      expect(await page.locator('img[src=x], app-bug-reports script').count()).toBe(0);
      expect(dialog).toBe(false);
    } finally { await admin.dispose(); }
  } finally {
    // Reports intentionally survive account deletion in the product. No DELETE API exists;
    // remove only reports owned by this disposable account before its fixture is deleted.
    try {
      await db().query('DELETE FROM bug_reports WHERE reporter_type=$1 AND reporter_user_id=$2', ['USER', account.id]);
      expect((await db().query('SELECT id FROM bug_report_screenshots WHERE bug_report_id=ANY($1::bigint[])', [reportIds])).rows).toEqual([]);
      expect((await db().query('SELECT id FROM bug_reports WHERE reporter_user_id=$1', [account.id])).rows).toEqual([]);
    } finally { await owner.dispose(); }
  }
});
