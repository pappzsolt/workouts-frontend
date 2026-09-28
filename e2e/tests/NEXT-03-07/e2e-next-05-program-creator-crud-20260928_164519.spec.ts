import { test, expect } from '@playwright/test';
import { apiFor, dbOne, dbCount, currentUserId, coachUserId, login, success, rejected, createProgram, createWorkout, createExercise, assignExercise, deleteProgram, deleteWorkout, deleteExercise, suffix, LANGUAGE } from '../helpers/e2e-next-3-helpers';


test('PROGRAM CREATOR: create → update → DB → API cleanup', async ({ page }) => {
  await login(page, 'coach');
  const api = await apiFor(page);
  const name = `E2E Creator ${suffix()}`;
  const updated = `${name} Updated`;
  const id = await createProgram(api, name);

  try {
    const before = await dbOne<{ name:string|null }>(
      `SELECT pt.name FROM public.program_translations pt
        JOIN public.languages l ON l.id=pt.language_id
       WHERE pt.program_id=$1 AND l.code=$2 LIMIT 1`, [id, LANGUAGE]);
    expect(before?.name).toBe(name);

    const response = await success(await api.put('/api/user-programs/update', {
      params:{ programId:id },
      data:{ userId:null, programName:updated, programDescription:'updated',
        durationDays:31, startDate:'2035-03-02', difficultyLevel:'advanced',
        languageCode:LANGUAGE, workouts:null }
    }), 'PUT /api/user-programs/update');
    expect(Number(response.data)).toBe(id);

    const after = await dbOne<{ name:string|null; duration_days:number }>(
      `SELECT pt.name,p.duration_days FROM public.program_translations pt
        JOIN public.languages l ON l.id=pt.language_id
        JOIN public.programs p ON p.id=pt.program_id
       WHERE pt.program_id=$1 AND l.code=$2 LIMIT 1`, [id, LANGUAGE]);
    expect(after?.name).toBe(updated);
    expect(Number(after?.duration_days)).toBe(31);
  } finally {
    await deleteProgram(api, id);
  }
  expect(await dbCount(`SELECT COUNT(*)::text AS count FROM public.programs WHERE id=$1`, [id])).toBe(0);
});

test('PROGRAM CREATOR NEGATIVE: USER cannot create or update programs', async ({ page }) => {
  await login(page, 'user');
  const api = await apiFor(page);
  expect((await api.post('/api/user-programs/create', { data:{
    userId:null, programName:`Forbidden ${suffix()}`, programDescription:'x',
    durationDays:30,startDate:'2035-03-01',difficultyLevel:'intermediate',
    languageCode:LANGUAGE,workouts:null
  }})).ok()).toBeFalsy();

  const denied = await rejected(await api.put('/api/user-programs/update', {
    params:{programId:999999999},
    data:{userId:null,programName:'Forbidden',programDescription:'x',durationDays:30,
      startDate:'2035-03-01',difficultyLevel:'intermediate',languageCode:LANGUAGE,workouts:null}
  }), 'USER PUT program creator');
  expect(denied).toBeTruthy();
});
