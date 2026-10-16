import { test, expect } from '@playwright/test';
import { randomInt } from 'node:crypto';
import { authenticate } from '../../helpers/auth-session';
import { API_ENDPOINTS as E } from '../../helpers/api-endpoints';
import {
  apiFor, closeDb, createExercise, db, dbOne, deleteExercise,
  deleteProgram, deleteWorkout, currentUserId, login, success, suffix,
} from '../../helpers/e2e-next-3-helpers';
import { reportSelect } from '../../helpers/select-report';

test.afterAll(closeDb);

test('COACH: új program + meglévő workout + új workout 3 gyakorlattal → PostgreSQL SELECT', async ({ page }) => {
  await login(page, 'coach');
  const api = await apiFor(page);
  const tag = suffix();
  const expected = {
    programName: `E2E két-workout program ${tag}`,
    workoutName: `E2E háromgyakorlatos workout ${tag}`,
    workoutDescription: `E2E program workflow ${tag}`,
    workoutDate: '2035-07-03', durationMinutes: 50, intensityLevel: 'Medium',
  };
  let programId: number | undefined;
  let workoutId: number | undefined;
  const exerciseIds: number[] = [];
  const relationIds: number[] = [];
  let assignedUserId: number | undefined;
  try {
    // Valóban korábban létező workout, a bejelentkezett edző tulajdonában.
    const existing = await dbOne<{ id: number; name: string }>(`
      SELECT w.id, wt.name FROM public.workouts w
      JOIN public.coaches c ON c.id = w.created_by_coach_id
      JOIN public.workout_translations wt ON wt.workout_id = w.id
      JOIN public.languages l ON l.id = wt.language_id
      WHERE c.name = $1 AND l.code = $2
        AND EXISTS (SELECT 1 FROM public.workout_exercises we WHERE we.workout_id=w.id)
      ORDER BY w.id LIMIT 1`,
      [process.env.E2E_COACH_USERNAME, process.env.E2E_LANGUAGE ?? 'hu']);
    expect(existing, 'Nincs a coachhoz tartozó meglévő workout; ne hozzunk létre helyette ál-meglévőt.').not.toBeNull();
    const existingId = Number(existing!.id);
    const before = await dbOne<{ count: string }>(
      'SELECT count(*)::text AS count FROM public.workouts WHERE id=$1', [existingId]);
    expect(before?.count).toBe('1');

    // 1. Program létrehozása az Angular felületen.
    await page.goto('/coach/programs/new');
    const editor = page.locator('app-coach-program-editor');
    await expect(editor.locator('[name=programName]')).toBeVisible();
    await editor.locator('[name=programName]').fill(expected.programName);
    await editor.locator('[name=programDescription]').fill(`E2E teljes kapcsolat teszt ${tag}`);
    await editor.locator('[name=startDate]').fill('2035-07-01');
    await editor.locator('[name=durationDays]').fill('14');
    await editor.getByRole('radio', { name: 'Profi', exact: true }).check();
    const programResponse = page.waitForResponse(r =>
      r.request().method() === 'POST' && new URL(r.url()).pathname === E.userPrograms.base);
    await editor.getByRole('button', { name: 'Létrehozás', exact: true }).click();
    const programBody = await success(await programResponse, 'Create program via UI');
    programId = Number(programBody.data);
    expect(Number.isSafeInteger(programId) && programId > 0).toBe(true);
    await expect(page).toHaveURL(new RegExp(`/coach/programs/${programId}$`));
    const programSql = `SELECT p.id, pt.name, p.start_date::text AS start_date,
      p.duration_days, p.difficulty_level FROM public.programs p
      JOIN public.program_translations pt ON pt.program_id=p.id
      JOIN public.languages l ON l.id=pt.language_id
      WHERE p.id=$1 AND l.code=$2`;
    const programStored = await dbOne(programSql, [programId, process.env.E2E_LANGUAGE ?? 'hu']);
    await reportSelect('flow-created-program', programSql, expected.programName, programStored);
    expect(programStored?.name).toBe(expected.programName);

    // Az Angular workout-szerkesztő a gyakorlattörzset az oldal megnyitásakor tölti be.
    // Ezért a három tesztgyakorlatnak már a szerkesztő megnyitása előtt léteznie kell.
    for (let i = 1; i <= 3; i++) {
      exerciseIds.push(await createExercise(api, `E2E flow gyakorlat ${i} ${tag}`));
    }

    // 2. Új workout létrehozása UI-n.
    await page.goto('/coach/workouts/new');
    const form = page.locator('app-newworkout form').first();
    await expect(form.locator('#workoutName')).toBeVisible();
    await form.locator('#workoutName').fill(expected.workoutName);
    await form.locator('#description').fill(expected.workoutDescription);
    await form.locator('#workoutDate').fill(expected.workoutDate);
    await form.locator('#durationMinutes').fill(String(expected.durationMinutes));
    await form.locator('select#intensityLevel').selectOption(expected.intensityLevel);
    const workoutResponse = page.waitForResponse(r =>
      r.request().method() === 'POST' && new URL(r.url()).pathname === E.workouts.base);
    await form.locator('button[type=submit]').click();
    const workoutBody = await success(await workoutResponse, 'Create workout via UI');
    workoutId = Number(workoutBody.data?.id);
    expect(Number.isSafeInteger(workoutId) && workoutId > 0).toBe(true);
    await expect(page).toHaveURL(new RegExp(`/coach/workouts/${workoutId}/edit$`));
    const workoutSql = `SELECT w.id, wt.name, wt.description,
      w.workout_date::text AS workout_date, w.duration_minutes, w.intensity_level
      FROM public.workouts w JOIN public.workout_translations wt ON wt.workout_id=w.id
      JOIN public.languages l ON l.id=wt.language_id WHERE w.id=$1 AND l.code=$2`;
    const workoutStored = await dbOne(workoutSql, [workoutId, process.env.E2E_LANGUAGE ?? 'hu']);
    await reportSelect('flow-created-workout', workoutSql, expected, workoutStored);
    expect(workoutStored).toMatchObject({
      name: expected.workoutName, description: expected.workoutDescription,
      workout_date: expected.workoutDate, duration_minutes: expected.durationMinutes,
      intensity_level: expected.intensityLevel,
    });

    // 3. Három különböző gyakorlat létrehozása tesztadatként, majd UI-n hozzárendelés.
    for (let i = 1; i <= 3; i++) {
      const name = `E2E flow gyakorlat ${i} ${tag}`;
      const exerciseId = exerciseIds[i - 1];
      const search = page.locator('#exerciseSearch');
      await expect(search).toBeVisible();
      await search.fill(name);
      const option = page.getByRole('button')
        .filter({ hasText: new RegExp(`^\\s*${name}\\s*\\+\\s*$`) });
      await expect(option).toHaveCount(1);
      await option.click();
      const add = page.getByRole('button', { name: 'Exercise hozzáadása', exact: true });
      await expect(add).toBeEnabled();
      const pending = page.waitForResponse(r => {
        const url = new URL(r.url());
        return r.request().method() === 'POST' &&
          url.pathname === E.workoutExercises.base &&
          Number(url.searchParams.get('workoutId')) === workoutId &&
          Number(url.searchParams.get('exerciseId')) === exerciseId;
      });
      await add.click();
      await success(await pending, `Add exercise ${i} via UI`);
    }
    const exerciseSql = `SELECT we.id, we.workout_id, we.exercise_id,
      et.name AS exercise_name, we.order_index, we.sets, we.repetitions
      FROM public.workout_exercises we
      JOIN public.exercise_translations et ON et.exercise_id=we.exercise_id
      JOIN public.languages l ON l.id=et.language_id
      WHERE we.workout_id=$1 AND l.code=$2 ORDER BY we.order_index,we.id`;
    const exercisesStored = (await db().query(exerciseSql, [workoutId, process.env.E2E_LANGUAGE ?? 'hu'])).rows;
    await reportSelect('flow-three-exercises', exerciseSql, exerciseIds, exercisesStored);
    expect(exercisesStored).toHaveLength(3);
    expect(new Set(exercisesStored.map(r => Number(r.exercise_id)))).toEqual(new Set(exerciseIds));

    // 4. Mindkét workoutot ugyanahhoz a programhoz rendeljük a tényleges API-n.
    for (const [dayIndex, id] of [[1, existingId], [2, workoutId]] as const) {
      const body = await success(await api.post(E.programWorkouts.base, {
        data: { programId, workoutId: id, dayIndex },
      }), `Attach workout at day ${dayIndex}`);
      const relationId = Number(body.data?.id);
      expect(relationId).toBeGreaterThan(0);
      relationIds.push(relationId);
    }
    const relationsSql = `SELECT pw.id, pw.program_id, pw.workout_id, pw.day_index,
      wt.name AS workout_name FROM public.program_workouts pw
      JOIN public.workout_translations wt ON wt.workout_id=pw.workout_id
      JOIN public.languages l ON l.id=wt.language_id
      WHERE pw.program_id=$1 AND l.code=$2 ORDER BY pw.day_index,pw.id`;
    const storedRelations = (await db().query(relationsSql, [programId, process.env.E2E_LANGUAGE ?? 'hu'])).rows;
    await reportSelect('flow-two-program-workouts', relationsSql,
      [{ workoutId: existingId, dayIndex: 1 }, { workoutId, dayIndex: 2 }], storedRelations);
    expect(storedRelations).toHaveLength(2);
    expect(storedRelations.map(r => Number(r.workout_id))).toEqual([existingId, workoutId]);
    expect(storedRelations.map(r => Number(r.day_index))).toEqual([1, 2]);
    expect(storedRelations[0].workout_name).toBe(existing!.name);
    expect(storedRelations[1].workout_name).toBe(expected.workoutName);
    expect((await dbOne<{ count: string }>('SELECT count(*)::text AS count FROM public.workouts WHERE id=$1', [existingId]))?.count).toBe('1');

    // 5. Program kiosztása kizárólag a konfigurált E2E tesztfelhasználónak.
    // A kilogrammban megadott sorozatsúly nem a workoutsablon mezője,
    // hanem a felhasználóhoz kiosztott edzés sorozatadata.
    assignedUserId = await currentUserId();
    const userOwner = await dbOne(`SELECT u.id FROM public.users u
      JOIN public.coaches c ON c.id=u.coach_id
      WHERE u.id=$1 AND c.name=$2`, [assignedUserId, process.env.E2E_COACH_USERNAME]);
    expect(userOwner, 'Az E2E_USER nem az E2E_COACH ügyfele').not.toBeNull();
    await success(await api.post(E.programs.assign, {
      data: { programId, userId: assignedUserId },
    }), 'Assign E2E program to test user');

    // 6. Mindkét workout minden generált sorozatához eltérő, véletlen
    // célértékeket állítunk be: súly 20–100 kg, ismétlés 1–10, megjegyzés teszt.
    const setsSql = `SELECT uw.workout_id, s.id, s.set_number,
      s.target_weight_kg::text AS target_weight_kg,
      s.target_repetitions, s.notes
      FROM public.user_workout_exercise_sets s
      JOIN public.user_workout_exercises uwe ON uwe.id=s.user_workout_exercise_id
      JOIN public.user_workouts uw ON uw.id=uwe.user_workout_id
      WHERE uw.program_id=$1 AND uw.user_id=$2
      ORDER BY uw.workout_id, uwe.id, s.set_number`;
    const beforeSets = (await db().query(setsSql, [programId, assignedUserId])).rows;
    expect(beforeSets.length, 'A kiosztás nem hozott létre sorozatokat').toBeGreaterThan(0);
    for (const id of [existingId, workoutId]) {
      expect(beforeSets.some(s => Number(s.workout_id) === id),
        `A workout ${id} egyetlen sorozatot sem tartalmaz`).toBe(true);
    }
    const expectedSets = new Map<number, { weight: number; repetitions: number; notes: string }>();
    for (const set of beforeSets) {
      const setId = Number(set.id);
      const weight = randomInt(20, 101);
      const repetitions = randomInt(1, 11);
      expectedSets.set(setId, { weight, repetitions, notes: 'teszt' });
      await success(await api.put(E.userWorkoutExerciseSets.byId(setId), {
        data: { targetWeightKg: weight, targetRepetitions: repetitions, notes: 'teszt' },
      }), `Update set ${setId}`);
    }
    const savedSets = (await db().query(setsSql, [programId, assignedUserId])).rows;
    await reportSelect('flow-both-workouts-random-sets', setsSql,
      [...expectedSets.entries()].map(([id, value]) => ({ id, ...value })), savedSets);
    expect(savedSets).toHaveLength(expectedSets.size);
    for (const row of savedSets) {
      const expectedSet = expectedSets.get(Number(row.id));
      expect(expectedSet, `Nem várt sorozat: ${row.id}`).toBeDefined();
      expect(Number(row.target_weight_kg)).toBe(expectedSet!.weight);
      expect(Number(row.target_repetitions)).toBe(expectedSet!.repetitions);
      expect(row.notes).toBe('teszt');
    }
    // A meglévő workoutsablon változatlan; csak a tesztfelhasználó személyes
    // sorozatai változtak, és azokat a finally blokkban eltávolítjuk.
  } finally {
    const cleanupErrors: unknown[] = [];
    // A személyes előírásokat előbb a USER saját programjának törlésével
    // távolítjuk el. A régi workoutsablont nem módosítjuk vagy töröljük.
    if (programId !== undefined && assignedUserId !== undefined) {
      const assigned = await dbOne('SELECT id FROM public.user_programs WHERE program_id=$1 AND user_id=$2',
        [programId, assignedUserId]);
      if (assigned) {
        const userPage = await page.context().newPage();
        let userApi: Awaited<ReturnType<typeof apiFor>> | undefined;
        try {
          await authenticate(userPage, 'user');
          userApi = await apiFor(userPage);
          await success(await userApi.delete(E.programs.myById(programId)),
            'Cleanup test user assigned program');
        } catch (error) { cleanupErrors.push(error); }
        finally { await userApi?.dispose(); await userPage.close(); }
      }
    }
    if (programId !== undefined) {
      try { await deleteProgram(api, programId); } catch (error) { cleanupErrors.push(error); }
    }
    if (workoutId !== undefined) {
      try { await deleteWorkout(api, workoutId); } catch (error) { cleanupErrors.push(error); }
    }
    for (const id of exerciseIds.reverse()) {
      try { await deleteExercise(api, id); } catch (error) { cleanupErrors.push(error); }
    }
    await api.dispose();
    if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'E2E workflow cleanup failed');
  }
});
