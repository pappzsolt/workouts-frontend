import { test, expect, plan, signIn, complete, result, response, unique, date } from './scenario-fixture';
import { BACKEND } from './live-fixture';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

for (const language of ['hu', 'en', 'de']) for (const scope of ['coach', 'personal'] as const) {
  test(`${scope} Excel: ${language} export megnyitható, böngészős előellenőrzés és import végigmegy`, async ({ page, actors: a }, info) => {
    const p = await plan(a.coach, a.user, { days: [1], sets: 1, exercises: 1 }); await complete(a.user, p.scheduled[0].user_workout_id, 42.5);
    const workbook = await a.user.api.get(`/api/user-workout-exercises/user-programs/${a.user.id}/${p.id}/export?language=${language}`); expect(workbook.status()).toBe(200);
    expect(workbook.headers()['content-type']).toContain('spreadsheetml'); const bytes = await workbook.body();
    const summary = JSON.parse(execFileSync('python3', ['-c', 'import sys,zipfile,io,json,xml.etree.ElementTree as E; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.testzip() is None; print(json.dumps({"sheets":len([n for n in z.namelist() if n.startswith("xl/worksheets/sheet") and n.endswith(".xml")]),"text":" ".join(" ".join(E.fromstring(z.read(n)).itertext()) for n in z.namelist() if n.endswith(".xml"))}))'], { input: bytes }).toString());
    expect(summary.sheets).toBeGreaterThanOrEqual(2); expect(summary.text).toContain(p.exercises[0].name); expect(summary.text).toContain('42.5');
    await signIn(page, scope === 'coach' ? a.coach : a.user);
    if (scope === 'personal') {
      await page.goto('/user/my-programs'); const download = page.waitForEvent('download'); await page.locator('app-user-my-programs').getByRole('button', { name: /Excel/ }).click();
      const file = await download; expect(file.suggestedFilename()).toMatch(/\.xlsx$/); expect(await file.failure()).toBeNull(); const path = info.outputPath('download.xlsx'); await file.saveAs(path);
      const valid = execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print("valid")', path]).toString().trim(); expect(valid).toBe('valid');
    }
    await page.goto(scope === 'coach' ? '/coach/programs/import' : '/user/personal-programs/import'); const root = page.locator('app-program-import');
    if (scope === 'coach') await root.locator('[name=client]').selectOption({ label: a.user.username });
    await root.locator('input[type=file]').setInputFiles({ name: `export-${language}.xlsx`, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: bytes });
    const name = unique('Importált'); await root.locator('[name=programName]').fill(name); await root.locator('[name=startDate]').fill(date());
    const prefix = scope === 'coach' ? '/api/user-programs/import' : '/api/me/personal-programs/import';
    const preview = response(page, 'POST', `${prefix}/preview`); await root.getByRole('button', { name: 'Előellenőrzés', exact: true }).click();
    const checked = await preview; expect(checked.status()).toBe(200); const before = (await checked.json()).data; expect(before.unresolvedExercises).toEqual([]); expect(before.sets).toBe(1);
    const imported = response(page, 'POST', prefix); await root.getByRole('button', { name: 'Új program létrehozása', exact: true }).click();
    const importedResponse = await imported; expect(importedResponse.status()).toBe(200); const data = (await importedResponse.json()).data;
    await expect(root.getByRole('link', { name: 'Program megnyitása', exact: true })).toBeVisible(); await root.getByRole('link', { name: 'Program megnyitása', exact: true }).click();
    expect(data.programId).toBeGreaterThan(0);
    if (scope === 'personal') { await expect(page).toHaveURL(new RegExp(`/user/personal-programs/${data.programId}$`)); await expect(page.locator('app-personal-program-editor [name=name]')).toHaveValue(name); }
    else { await expect(page).toHaveURL(new RegExp(`/coach/clients/${a.user.id}\\?program=${data.programId}$`)); await expect(page.locator('app-coach-client-detail')).toContainText(name); }
  });
}

for (const file of ['Zsolti_eroemeles_7-11_het.xlsx', 'Zsolti_eroemeles_7-11_het_FRISSITETT_20261027.xlsx']) for (const scope of ['coach', 'personal'] as const) {
  test(`${scope} heti Excel-változat és képletek: ${file}`, async ({ page, actors: a }) => {
    await signIn(page, scope === 'coach' ? a.coach : a.user); await page.goto(scope === 'coach' ? '/coach/programs/import' : '/user/personal-programs/import');
    const root = page.locator('app-program-import'); if (scope === 'coach') await root.locator('[name=client]').selectOption({ label: a.user.username });
    await root.locator('input[type=file]').setInputFiles(join(BACKEND, 'DATA/excel', file)); await root.locator('[name=startDate]').fill(date());
    const preview = response(page, 'POST', scope === 'coach' ? '/api/user-programs/import/preview' : '/api/me/personal-programs/import/preview');
    await root.getByRole('button', { name: 'Előellenőrzés', exact: true }).click(); const r = await preview; expect(r.status()).toBe(200); const data = (await r.json()).data;
    expect(data.workouts).toBe(20); expect(data.exercises).toBe(100); expect(data.sets).toBe(file.includes('FRISSITETT') ? 218 : 215);
    if (data.unresolvedExercises.length) await expect(root.getByRole('button', { name: 'Új program létrehozása', exact: true })).toBeDisabled();
  });
}

for (const scope of ['coach', 'personal'] as const) for (const invalid of ['extension', 'empty', 'oversize', 'corrupt']) {
  test(`${scope} import hiba: ${invalid}, nincs részleges programlétrehozás`, async ({ page, actors: a }) => {
    const who = scope === 'coach' ? a.coach : a.user;
    await signIn(page, who); await page.goto(scope === 'coach' ? '/coach/programs/import' : '/user/personal-programs/import'); const root = page.locator('app-program-import');
    if (scope === 'coach') await root.locator('[name=client]').selectOption({ label: a.user.username });
    const writes: string[] = []; page.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).pathname.endsWith('/import')) writes.push(r.url()); });
    await root.locator('input[type=file]').setInputFiles({ name: invalid === 'extension' ? 'wrong.csv' : 'broken.xlsx', mimeType: 'application/octet-stream', buffer: invalid === 'empty' ? Buffer.alloc(0) : invalid === 'oversize' ? Buffer.alloc(5 * 1024 * 1024 + 1, 1) : Buffer.from('not a workbook') });
    if (invalid === 'corrupt') {
      const failed = response(page, 'POST', scope === 'coach' ? '/api/user-programs/import/preview' : '/api/me/personal-programs/import/preview'); await root.getByRole('button', { name: 'Előellenőrzés', exact: true }).click(); expect((await failed).status()).toBe(400);
    } else await expect(root.getByRole('button', { name: 'Előellenőrzés', exact: true })).toBeDisabled();
    await expect(root.locator('app-message')).toContainText(/.+/); expect(writes).toEqual([]);
  });
}
