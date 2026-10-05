import { expect, type APIRequestContext } from '@playwright/test';
import { API_ENDPOINTS } from './api-endpoints';
import { assignExercise, createExercise, createProgram, createWorkout, db, dbOne, deleteExercise, deleteProgram, deleteWorkout, success } from './e2e-next-3-helpers';

export type AuditFixture = { programId: number; workoutId: number; exerciseId: number };

export async function createAuditFixture(api: APIRequestContext): Promise<AuditFixture> {
  let programId: number | undefined;
  let workoutId: number | undefined;
  let exerciseId: number | undefined;
  try {
    programId = await createProgram(api);
    workoutId = await createWorkout(api);
    exerciseId = await createExercise(api);
    await assignExercise(api, workoutId, exerciseId);
    return { programId, workoutId, exerciseId };
  } catch (error) {
    const failures: unknown[] = [error];
    for (const [id, remove] of [[programId, deleteProgram], [workoutId, deleteWorkout], [exerciseId, deleteExercise]] as const) {
      if (id !== undefined) { try { await remove(api, id); } catch (cleanupError) { failures.push(cleanupError); } }
    }
    throw new AggregateError(failures, 'Fixture creation failed');
  }
}

export async function attach(api: APIRequestContext, f: AuditFixture, dayIndex = 1): Promise<number> {
  const body = await success(await api.post(API_ENDPOINTS.programWorkouts.base, {
    data: { programId: f.programId, workoutId: f.workoutId, dayIndex },
  }), 'Attach occurrence');
  expect(body.success).toBe(true);
  expect(body.data.dayIndex).toBe(dayIndex);
  const id = Number(body.data.id);
  expect(id).toBeGreaterThan(0);
  return id;
}

export async function assign(api: APIRequestContext, f: AuditFixture, userId: number): Promise<void> {
  await success(await api.post(API_ENDPOINTS.programs.assign, { data: { programId: f.programId, userId } }), 'Assign program');
}

export async function cleanupAuditFixture(api: APIRequestContext, f: AuditFixture): Promise<void> {
  const errors: unknown[] = [];
  for (const [id, remove] of [[f.programId, deleteProgram], [f.workoutId, deleteWorkout], [f.exerciseId, deleteExercise]] as const) {
    try { await remove(api, id); } catch (error) { errors.push(error); }
  }
  if (errors.length) throw new AggregateError(errors, 'API fixture cleanup failed');
  const result = await dbOne<{ remaining: string }>(`SELECT (
    (SELECT count(*) FROM programs WHERE id=$1) +
    (SELECT count(*) FROM program_workouts WHERE program_id=$1) +
    (SELECT count(*) FROM user_programs WHERE program_id=$1) +
    (SELECT count(*) FROM workouts WHERE id=$2) +
    (SELECT count(*) FROM exercises WHERE id=$3) +
    (SELECT count(*) FROM workout_exercises WHERE workout_id=$2 OR exercise_id=$3)
  )::text AS remaining`, [f.programId, f.workoutId, f.exerciseId]);
  expect(Number(result?.remaining)).toBe(0);
}

export async function snapshotProgram(programId: number): Promise<unknown> {
  const result = await db().query(`SELECT jsonb_build_object(
    'program', (SELECT to_jsonb(p) FROM programs p WHERE p.id=$1),
    'occurrences', (SELECT coalesce(jsonb_agg(to_jsonb(pw) ORDER BY pw.id), '[]'::jsonb) FROM program_workouts pw WHERE pw.program_id=$1),
    'assignments', (SELECT coalesce(jsonb_agg(to_jsonb(up) ORDER BY up.id), '[]'::jsonb) FROM user_programs up WHERE up.program_id=$1),
    'workouts', (SELECT coalesce(jsonb_agg(to_jsonb(uw) ORDER BY uw.id), '[]'::jsonb) FROM user_workouts uw JOIN program_workouts pw ON pw.id=uw.program_workout_id WHERE pw.program_id=$1),
    'exercises', (SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.id), '[]'::jsonb) FROM user_workout_exercises e JOIN user_workouts uw ON uw.id=e.user_workout_id WHERE uw.program_id=$1),
    'sets', (SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id), '[]'::jsonb) FROM user_workout_exercise_sets s JOIN user_workout_exercises e ON e.id=s.user_workout_exercise_id JOIN user_workouts uw ON uw.id=e.user_workout_id WHERE uw.program_id=$1)
  ) AS snapshot`, [programId]);
  return result.rows[0].snapshot;
}
