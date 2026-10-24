import { expect, request, test } from '@playwright/test';
import { authenticateAndOpen, getAuthenticatedAccessToken } from '../../helpers/auth-session';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { assertWorkoutInDatabase, assertWorkoutDeleted } from '../../helpers/workout-db';

const apiBaseUrl = process.env.E2E_API_URL ?? 'http://localhost:8080';

test.describe('Coach – új workout létrehozása és PostgreSQL ellenőrzése', () => {
  test('kötelező név és dátum nélkül nem küld létrehozási kérést', async ({ page }) => {
    await authenticateAndOpen(page, 'coach');
    await page.goto('/coach/workouts/new');
    const form = page.locator('app-newworkout form');
    await expect(form.locator('#workoutName')).toBeVisible();
    const submit = form.locator('button[type="submit"]');
    await expect(submit).toBeDisabled();
    await form.locator('#workoutName').fill('Playwright kötelező mező ellenőrzése');
    await expect(submit).toBeDisabled();
    await form.locator('#workoutDate').fill('2035-02-17');
    await expect(submit).toBeEnabled();
  });

  test('űrlap → POST /api/workouts → PostgreSQL rekord és fordítás → takarítás', async ({ page }) => {
    await authenticateAndOpen(page, 'coach');
    await page.goto('/coach/workouts/new');
    const form = page.locator('app-newworkout form');
    await expect(form.locator('#workoutName')).toBeVisible();

    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const expected = {
      name: `E2E új Workout ${unique}`,
      description: `UI és PostgreSQL ellenőrzés ${unique}`,
      workoutDate: '2035-02-17',
      durationMinutes: 55,
      intensityLevel: 'MEDIUM',
    };
    await form.locator('#workoutName').fill(expected.name);
    await form.locator('#description').fill(expected.description);
    await form.locator('#workoutDate').fill(expected.workoutDate);
    await form.locator('#durationMinutes').fill(String(expected.durationMinutes));
    await form.locator('select#intensityLevel').selectOption(expected.intensityLevel);

    const responsePromise = page.waitForResponse(r =>
      r.request().method() === 'POST' && new URL(r.url()).pathname === API_ENDPOINTS.workouts.base,
    );
    await form.locator('button[type="submit"]').click();
    const response = await responsePromise;
    expect(response.ok(), `Workout POST: HTTP ${response.status()}`).toBe(true);
    const body = await response.json();
    expect(body.success).toBe(true);
    const id = Number(body.data?.id);
    expect(Number.isSafeInteger(id) && id > 0, 'A backendnek valós workout ID-t kell visszaadnia').toBe(true);

    try {
      await expect(page).toHaveURL(new RegExp(`/coach/workouts/${id}/edit$`));
      const stored = await assertWorkoutInDatabase(id, { language: process.env.E2E_LANGUAGE ?? 'hu' });
      // A PostgreSQL SELECT eredményét a Playwright terminálkimenetén is megjelenítjük.
      // A helper paraméterezett SELECT-et futtat a workouts és workout_translations táblákon.
      console.log(`\n[POSTGRESQL SELECT] Workout ID: ${id}`);
      console.table([{
        id: stored.id,
        name: stored.name,
        description: stored.description,
        workout_date: stored.workout_date,
        duration_minutes: stored.duration_minutes,
        intensity_level: stored.intensity_level,
      }]);
      console.log('[ŰRLAPON MEGADOTT ÉRTÉKEK]');
      console.table([expected]);
      await test.info().attach('workout-postgresql-select.json', {
        body: JSON.stringify({ workoutId: id, expected, selectResult: stored }, null, 2),
        contentType: 'application/json',
      });
      expect(stored.name).toBe(expected.name);
      expect(stored.description).toBe(expected.description);
      expect(stored.workout_date).toBe(expected.workoutDate);
      expect(Number(stored.duration_minutes)).toBe(expected.durationMinutes);
      expect(stored.intensity_level).toBe(expected.intensityLevel);
    } finally {
      // Only delete the row created by this test, not existing coach workouts.
      const token = getAuthenticatedAccessToken(page);
      const api = await request.newContext({
        baseURL: apiBaseUrl,
        extraHTTPHeaders: { Authorization: `Bearer ${token}` },
      });
      try {
        const removed = await api.delete(API_ENDPOINTS.workouts.byId(id));
        expect(removed.ok(), `Tesztadat törlése: HTTP ${removed.status()} ${await removed.text()}`).toBe(true);
        await assertWorkoutDeleted(id);
      } finally {
        await api.dispose();
      }
    }
  });
});
