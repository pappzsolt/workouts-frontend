import { expect, test } from '@playwright/test';
import {
  apiFor, createProgram, createWorkout, dbOne, deleteProgram, deleteWorkout,
  login, rejected, success, suffix
} from './e2e-next-3-helpers';

test.describe('Coach - ProgramWorkout endpoint matrix', () => {
  test.describe.configure({ mode: 'serial' });

  test('PROGRAM-WORKOUT: add → GET → assigned → update dayIndex → duplicate rejection → delete by id → DB', async ({ page }) => {
    await login(page, 'coach');
    const api = await apiFor(page);

    const programId = await createProgram(api, `E2E PW PROGRAM ${suffix()}`);
    const workoutId = await createWorkout(api, `E2E PW WORKOUT ${suffix()}`);
    let relationId = 0;

    try {
      const created = await success(await api.post('/api/program-workouts/add', {
        data: { programId, workoutId, dayIndex: 1 },
      }), 'POST /api/program-workouts/add');

      relationId = Number(created.data?.id);
      expect(relationId).toBeGreaterThan(0);
      expect(Number(created.data?.programId)).toBe(programId);
      expect(Number(created.data?.workoutId)).toBe(workoutId);
      expect(Number(created.data?.dayIndex)).toBe(1);

      const rows = await success(
        await api.get(`/api/program-workouts?programId=${programId}`),
        'GET /api/program-workouts?programId',
      );
      expect(Array.isArray(rows.data)).toBeTruthy();
      expect(rows.data.some((x: any) => Number(x.id) === relationId)).toBeTruthy();

      const assigned = await success(
        await api.get(`/api/program-workouts/workout/${workoutId}/assigned`),
        'GET /api/program-workouts/workout/{workoutId}/assigned',
      );
      expect(assigned.data?.assigned).toBe(true);

      const updated = await success(await api.put('/api/program-workouts/update', {
        data: { id: relationId, programId, workoutId, dayIndex: 3 },
      }), 'PUT /api/program-workouts/update');

      // The endpoint must return the freshly updated entity, not the stale
      // JPA entity that was loaded before the bulk UPDATE.
      expect(Number(updated.data?.id)).toBe(relationId);
      expect(Number(updated.data?.programId)).toBe(programId);
      expect(Number(updated.data?.workoutId)).toBe(workoutId);
      expect(Number(updated.data?.dayIndex)).toBe(3);

      const dbAfterUpdate = await dbOne<{ program_id: number; workout_id: number; day_index: number }>(
        `SELECT program_id, workout_id, day_index FROM public.program_workouts WHERE id=$1`,
        [relationId],
      );
      expect(Number(dbAfterUpdate?.program_id)).toBe(programId);
      expect(Number(dbAfterUpdate?.workout_id)).toBe(workoutId);
      expect(Number(dbAfterUpdate?.day_index)).toBe(3);

      // Same program + workout + same dayIndex is explicitly rejected by the service.
      const duplicate = await rejected(await api.post('/api/program-workouts/add', {
        data: { programId, workoutId, dayIndex: 3 },
      }), 'POST duplicate program-workout');
      expect(duplicate).toBeTruthy();

      expect(await dbOne<{ count: string }>(
        `SELECT count(*)::text AS count FROM public.program_workouts WHERE id=$1`,
        [relationId],
      ).then(r => Number(r?.count))).toBe(1);

      // Same workout may legally occur at another dayIndex.
      const second = await success(await api.post('/api/program-workouts/add', {
        data: { programId, workoutId, dayIndex: 5 },
      }), 'POST same workout / different dayIndex');
      const secondId = Number(second.data?.id);
      expect(secondId).toBeGreaterThan(0);
      expect(secondId).not.toBe(relationId);

      await success(
        await api.delete(`/api/program-workouts/id/${relationId}`),
        'DELETE /api/program-workouts/id/{id}',
      );
      expect(await dbOne<{ count: string }>(
        `SELECT count(*)::text AS count FROM public.program_workouts WHERE id=$1`,
        [relationId],
      ).then(r => Number(r?.count))).toBe(0);

      await success(
        await api.delete(`/api/program-workouts/${programId}/${workoutId}`),
        'DELETE /api/program-workouts/{programId}/{workoutId}',
      );
      expect(await dbOne<{ count: string }>(
        `SELECT count(*)::text AS count FROM public.program_workouts WHERE id=$1`,
        [secondId],
      ).then(r => Number(r?.count))).toBe(0);

      const finalAssigned = await success(
        await api.get(`/api/program-workouts/workout/${workoutId}/assigned`),
        'GET assigned after delete',
      );
      expect(finalAssigned.data?.assigned).toBe(false);
    } finally {
      const left = await dbOne<{ count: string }>(
        `SELECT count(*)::text AS count FROM public.program_workouts WHERE program_id=$1`,
        [programId],
      );
      if (Number(left?.count ?? 0) > 0) {
        await success(await api.delete(`/api/program-workouts/${programId}`), 'cleanup program-workouts');
      }
      await deleteProgram(api, programId);
      await deleteWorkout(api, workoutId);
      await api.dispose();
    }
  });

  test('NEGATIVE: nem létező program/workout kapcsolat nem módosít DB-t', async ({ page }) => {
    await login(page, 'coach');
    const api = await apiFor(page);
    const before = await dbOne<{ count: string }>(
      `SELECT count(*)::text AS count FROM public.program_workouts WHERE program_id=$1 OR workout_id=$2`,
      [2147483001, 2147483002],
    );
    await rejected(await api.post('/api/program-workouts/add', {
      data: { programId: 2147483001, workoutId: 2147483002, dayIndex: 1 },
    }), 'POST invalid program-workout');
    const after = await dbOne<{ count: string }>(
      `SELECT count(*)::text AS count FROM public.program_workouts WHERE program_id=$1 OR workout_id=$2`,
      [2147483001, 2147483002],
    );
    expect(Number(after?.count)).toBe(Number(before?.count));
    await api.dispose();
  });
});
