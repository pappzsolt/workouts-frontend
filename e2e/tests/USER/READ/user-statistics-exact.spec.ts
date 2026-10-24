import { test, expect } from '../../helpers/p1-fixture';
import { closeDb, db, success } from '../../helpers/e2e-next-3-helpers';
import { API_ENDPOINTS as E } from '../../helpers/api-endpoints';

test.afterAll(closeDb);
test.describe.configure({ timeout: 120_000 });
test('STATISTICS EXACT: two known workouts → partial/full completion, weekly volumes, activity and 1RM', async ({ plan: p }) => {
  const stats = async () => (await success(await p.owner.get(E.statistics.userProgram, { params: { language: 'hu' } }), 'Read exact program statistics')).data;
  const initial = await stats();
  expect(initial).toMatchObject({ totalPrograms: 1, completedPrograms: 0 });
  expect(initial.programs).toHaveLength(1);
  expect(initial.programs[0]).toMatchObject({ programId: p.programId, totalWorkouts: 2, completedWorkouts: 0, completed: false });
  // 3 March: 50×10 + 60×5 + 40×12 = 1280 kg; 10 March: 60×10 + 70×5 + 50×12 = 1550 kg.
  // Values and dates are supplied through the mobile API; no SQL writes manufacture statistics.
  const values = [
    { date: '2025-03-03', sets: [[10, 50], [5, 60], [12, 40]], volume: 1280 },
    { date: '2025-03-10', sets: [[10, 60], [5, 70], [12, 50]], volume: 1550 },
  ];
  for (let i = 0; i < values.length; i++) {
    const workout = p.workouts[i];
    const sets = p.sets.filter(s => s.user_workout_id === workout.id);
    await success(await p.owner.put(E.mobile.userWorkoutState(workout.id), { data: {
      status: 'IN_PROGRESS', startedAt: `${values[i].date}T10:00:00Z`, completedAt: null, userNote: null, sets: [],
    } }), 'Start deterministic workout before completion');
    await success(await p.owner.put(E.mobile.userWorkoutState(workout.id), { data: {
      status: 'COMPLETED', startedAt: `${values[i].date}T10:00:00Z`, completedAt: `${values[i].date}T11:00:00Z`, userNote: 'P1 exact statistics',
      sets: sets.map((s, n) => ({ userWorkoutSetId: s.id, actualReps: values[i].sets[n][0], actualWeightKg: values[i].sets[n][1], completed: true, notes: null })),
    } }), 'Complete deterministic workout');
    const current = await stats();
    expect(current.programs[0]).toMatchObject({ totalWorkouts: 2, completedWorkouts: i + 1, completed: i === 1 });
    expect(current.completedPrograms).toBe(i === 1 ? 1 : 0);
  }
  const final = (await stats()).programs[0];
  for (let i = 0; i < values.length; i++) {
    const week = final.weeklyVolumes.find((w: any) => w.week === i + 1);
    expect(week).toMatchObject({ weekStart: values[i].date, completedSets: 3, repetitions: 27, plannedSets: 3, completedPlannedSets: 3 });
    expect(Number(week.volumeKg)).toBe(values[i].volume);
  }
  expect(Number(final.weeklyVolumes.find((w: any) => w.week === 2).changePercent)).toBeCloseTo((1550 - 1280) / 1280 * 100, 1);
  const activity = (await success(await p.owner.get(E.statistics.userProgramWorkouts, { params: { from: '2025-03-01', to: '2025-03-31' } }), 'Exact workout activity')).data;
  expect(activity.monthlyActivity).toHaveLength(1);
  expect(activity.monthlyActivity[0]).toMatchObject({ workoutCount: 2, activeDays: 2, completedSets: 6 });
  expect(Number(activity.monthlyActivity[0].totalVolume)).toBe(2830);
  for (const expected of values) {
    const week = activity.weeklyActivity.find((w: any) => w.periodStart === expected.date);
    expect(week).toMatchObject({ workoutCount: 1, activeDays: 1, completedSets: 3 });
    expect(Number(week.totalVolume)).toBe(expected.volume);
  }
  const strength = (await success(await p.owner.get(E.statistics.userExerciseStrength(p.exerciseId), { params: { from: '2025-03-01', to: '2025-03-31', language: 'hu' } }), 'Exact strength progression')).data;
  expect(strength).toHaveLength(2);
  for (let i = 0; i < strength.length; i++) {
    expect(strength[i]).toMatchObject({ exerciseId: p.exerciseId, performedAt: values[i].date, repetitions: 5 });
    expect(Number(strength[i].bestWeightKg)).toBe(60 + i * 10);
    expect(Number(strength[i].estimatedOneRepMax)).toBeCloseTo((60 + i * 10) * (1 + 5 / 30), 6);
  }
  const outside = await success(await p.owner.get(E.statistics.userExerciseStrength(p.exerciseId), { params: { from: '2025-04-01', to: '2025-04-30', language: 'hu' } }), 'Exclude workouts outside requested dates');
  expect(outside.data).toEqual([]);
  const stored = (await db().query(`SELECT s.actual_repetitions,s.actual_weight_kg,s.completed,w.performed_at::date::text AS performed_day
    FROM user_workout_exercise_sets s JOIN user_workout_exercises e ON e.id=s.user_workout_exercise_id
    JOIN user_workouts w ON w.id=e.user_workout_id WHERE w.program_id=$1 ORDER BY w.scheduled_at,s.set_number`, [p.programId])).rows;
  expect(stored).toHaveLength(6);
  for (let i = 0; i < stored.length; i++) {
    const expected = values[Math.floor(i / 3)];
    expect(stored[i].performed_day).toBe(expected.date); expect(stored[i].completed).toBe(true);
    expect(Number(stored[i].actual_repetitions)).toBe(expected.sets[i % 3][0]);
    expect(Number(stored[i].actual_weight_kg)).toBe(expected.sets[i % 3][1]);
  }
});
