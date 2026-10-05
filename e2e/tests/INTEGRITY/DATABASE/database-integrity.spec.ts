import { expect, test } from '@playwright/test';
import { closeDb, db, dbCount } from '../../helpers/e2e-next-3-helpers';

test.describe.configure({ timeout: 90_000 });
test.afterAll(closeDb);

test('PostgreSQL: real schema constraints, foreign keys and business integrity', async () => {
  const checks: Record<string, string> = {
    'positive program days': 'SELECT count(*) AS count FROM program_workouts WHERE day_index IS NULL OR day_index <= 0',
    'unique program days': 'SELECT count(*) AS count FROM (SELECT program_id,day_index FROM program_workouts GROUP BY program_id,day_index HAVING count(*)>1) x',
    'unique assignments': 'SELECT count(*) AS count FROM (SELECT user_id,program_id FROM user_programs GROUP BY user_id,program_id HAVING count(*)>1) x',
    'positive workout targets': 'SELECT count(*) AS count FROM workout_exercises WHERE sets <= 0 OR repetitions <= 0',
    'positive set targets': 'SELECT count(*) AS count FROM user_workout_exercise_sets WHERE set_number<=0 OR target_repetitions<=0 OR target_weight_kg<0 OR actual_weight_kg<0 OR actual_repetitions<=0',
    'program dates': 'SELECT count(*) AS count FROM programs WHERE duration_days<=0 OR end_date IS DISTINCT FROM start_date + (duration_days-1)',
    'sets_done agrees with child sets': `SELECT count(*) AS count FROM user_workout_exercises e WHERE e.sets_done IS DISTINCT FROM (SELECT count(*)::integer FROM user_workout_exercise_sets s WHERE s.user_workout_exercise_id=e.id AND s.completed)`,
    'exercise completion agrees with sets': `SELECT count(*) AS count FROM user_workout_exercises e WHERE coalesce(e.completed,false) IS DISTINCT FROM (EXISTS(SELECT 1 FROM user_workout_exercise_sets s WHERE s.user_workout_exercise_id=e.id) AND NOT EXISTS(SELECT 1 FROM user_workout_exercise_sets s WHERE s.user_workout_exercise_id=e.id AND NOT s.completed))`,
    'workout completion agrees with exercises': `SELECT count(*) AS count FROM user_workouts w WHERE coalesce(w.completed,false) IS DISTINCT FROM (EXISTS(SELECT 1 FROM user_workout_exercises e WHERE e.user_workout_id=w.id) AND NOT EXISTS(SELECT 1 FROM user_workout_exercises e WHERE e.user_workout_id=w.id AND NOT coalesce(e.completed,false)))`,
    'user-workout occurrence contract': `SELECT count(*) AS count FROM user_workouts uw JOIN program_workouts pw ON pw.id=uw.program_workout_id WHERE uw.program_id IS DISTINCT FROM pw.program_id OR uw.workout_id IS DISTINCT FROM pw.workout_id`,
    'exercise/workout contract': `SELECT count(*) AS count FROM user_workout_exercises e JOIN user_workouts uw ON uw.id=e.user_workout_id JOIN workout_exercises we ON we.id=e.workout_exercise_id WHERE uw.workout_id<>we.workout_id`,
  };
  const foreignKeys = [
    ['program_workouts', 'program_id', 'programs'], ['program_workouts', 'workout_id', 'workouts'],
    ['user_programs', 'program_id', 'programs'], ['user_programs', 'user_id', 'users'],
    ['workout_exercises', 'workout_id', 'workouts'], ['workout_exercises', 'exercise_id', 'exercises'],
    ['user_workouts', 'user_id', 'users'], ['user_workouts', 'program_workout_id', 'program_workouts'],
    ['user_workout_exercises', 'user_workout_id', 'user_workouts'], ['user_workout_exercises', 'workout_exercise_id', 'workout_exercises'],
    ['user_workout_exercise_sets', 'user_workout_exercise_id', 'user_workout_exercises'],
  ];
  for (const [child, key, parent] of foreignKeys) {
    checks[`${child}.${key} FK`] = `SELECT count(*) AS count FROM ${child} c LEFT JOIN ${parent} p ON p.id=c.${key} WHERE c.${key} IS NOT NULL AND p.id IS NULL`;
  }
  for (const [label, sql] of Object.entries(checks)) expect(await dbCount(sql), label).toBe(0);
  const constraints = await db().query(`SELECT conname, convalidated, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='public.program_workouts'::regclass`);
  expect(constraints.rows).toContainEqual(expect.objectContaining({ conname: 'chk_program_workouts_day_index_positive', convalidated: true }));
  expect(constraints.rows.some(row => /UNIQUE \(program_id, day_index\)/.test(row.definition))).toBe(true);
  expect(await dbCount(`SELECT count(*) AS count FROM databasechangelog WHERE id='020-program-workout-positive-day-index' AND exectype='EXECUTED'`)).toBe(1);
});
