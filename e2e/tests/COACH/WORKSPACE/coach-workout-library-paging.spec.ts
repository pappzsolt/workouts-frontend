import { expect, test } from '@playwright/test';
import { apiFor, dbOne, login, rejected, success } from '../../helpers/e2e-next-3-helpers';

/*
 * Edzéstár: a backend lapoz, keres és rendez (GET /api/exercises/workouts/page).
 * A frontend mindig csak az aktuális oldalt kéri le.
 */

const PAGE_URL = '/api/exercises/workouts/page';

test('EDZÉSTÁR: lapozás, rendezés és keresés a backendben', async ({ page }) => {
  await login(page, 'coach');
  const api = await apiFor(page);
  try {
    const expected = await dbOne<{ total: number; newest: number[] }>(
      `SELECT count(*)::int AS total,
              (array_agg(w.id ORDER BY w.created_at DESC NULLS LAST, w.id DESC))[1:3] AS newest
         FROM workouts w
         JOIN coaches c ON c.id = w.created_by_coach_id
        WHERE c.name = $1`,
      [process.env.E2E_COACH_USERNAME],
    );
    expect(expected!.total, 'A coachnak legyen legalább 4 edzése a teszthez').toBeGreaterThanOrEqual(4);

    const first = (await success(await api.get(PAGE_URL, { params: { language: 'hu', page: 0, size: 3 } }), 'Első oldal')).data;
    expect(first.totalElements).toBe(expected!.total);
    expect(first.totalPages).toBe(Math.ceil(expected!.total / 3));
    expect(first.content.map((w: { id: number }) => w.id)).toEqual(expected!.newest);

    // A második oldal nem ismétli az elsőt.
    const second = (await success(await api.get(PAGE_URL, { params: { language: 'hu', page: 1, size: 3 } }), 'Második oldal')).data;
    const firstIds = new Set(first.content.map((w: { id: number }) => w.id));
    expect(second.content.length).toBeGreaterThan(0);
    for (const w of second.content) expect(firstIds.has(w.id)).toBe(false);

    // Név szerinti rendezés: a növekvő sorrend nevei a csökkenő fordítottjai
    // (így az adatbázis collation-jétől függetlenül ellenőrizhető).
    const nameList = async (sort: string) =>
      (await success(await api.get(PAGE_URL, { params: { language: 'hu', page: 0, size: 48, sort } }), `Név szerint ${sort}`))
        .data.content.map((w: { name: string }) => (w.name ?? '').toLowerCase());
    const asc = await nameList('nameAsc');
    const desc = await nameList('nameDesc');
    expect(asc).toEqual([...desc].reverse());

    // Keresés: csak a találatok, a darabszám is ehhez igazodik.
    const term = first.content[0].name.slice(0, 6);
    const searched = (await success(await api.get(PAGE_URL, { params: { language: 'hu', page: 0, size: 48, search: term } }), 'Keresés')).data;
    expect(searched.totalElements).toBe(searched.content.length);
    for (const w of searched.content) expect(w.name.toLowerCase()).toContain(term.toLowerCase());

    // Hibás paraméterek.
    await rejected(await api.get(PAGE_URL, { params: { page: -1 } }), 'Negatív oldal', 400);
    await rejected(await api.get(PAGE_URL, { params: { size: 1000 } }), 'Túl nagy oldalméret', 400);
    await rejected(await api.get(PAGE_URL, { params: { sort: 'barmi' } }), 'Ismeretlen rendezés', 400);
  } finally {
    await api.dispose();
  }
});

test('EDZÉSTÁR: a felület oldalanként kér, nem az egész listát', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.pathname.startsWith('/api/exercises/workouts')) requests.push(url.pathname + url.search);
  });
  await login(page, 'coach');
  const firstPage = page.waitForResponse((r) => new URL(r.url()).pathname === PAGE_URL);
  await page.goto('/coach/workouts');
  await firstPage;
  await expect(page.locator('app-coach-workouts app-card').first()).toBeVisible();
  expect(requests.length).toBeGreaterThan(0);
  for (const r of requests) expect(r.startsWith(PAGE_URL)).toBe(true);
});
