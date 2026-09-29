import { expect, test } from '@playwright/test';
import {
  apiFor,
  createProgram,
  createWorkout,
  dbCount,
  dbOne,
  deleteProgram,
  deleteWorkout,
  login,
  rejected,
  success,
  suffix,
} from '../../helpers/e2e-next-3-helpers';

test.describe('Coach - ProgramWorkout endpoint matrix', () => {
  test.describe.configure({ mode: 'serial' });

  test('PROGRAM-WORKOUT: add → GET → assigned → update → duplicate → second occurrence → delete by id → delete pair → DB', async ({
    page,
  }) => {
    await login(page, 'coach');
    const api = await apiFor(page);

    let programId: number | undefined;
    let workoutId: number | undefined;
    let relationId: number | undefined;
    let secondRelationId: number | undefined;

    try {
      programId = await createProgram(
        api,
        `E2E PROGRAM-WORKOUT PROGRAM ${suffix()}`,
      );
      workoutId = await createWorkout(
        api,
        `E2E PROGRAM-WORKOUT ${suffix()}`,
      );

      const created = await success(
        await api.post('/api/program-workouts', {
          data: {
            programId,
            workoutId,
            dayIndex: 1,
          },
        }),
        'POST /api/program-workouts',
      );

      relationId = Number(created.data?.id);
      expect(relationId).toBeGreaterThan(0);
      expect(Number(created.data?.programId)).toBe(programId);
      expect(Number(created.data?.workoutId)).toBe(workoutId);
      expect(Number(created.data?.dayIndex)).toBe(1);

      const programRows = await success(
        await api.get('/api/program-workouts', {
          params: { programId },
        }),
        'GET /api/program-workouts?programId',
      );
      expect(
        programRows.data.some(
          (row: any) => Number(row.id) === relationId,
        ),
      ).toBeTruthy();

      const assigned = await success(
        await api.get(`/api/program-workouts/workouts/${workoutId}/assigned`),
        'GET /api/program-workouts/workout/{workoutId}/assigned',
      );
      expect(assigned.data?.assigned).toBe(true);

      const updated = await success(
        await api.put(`/api/program-workouts/${relationId}`, {
          data: {
            id: relationId,
            programId,
            workoutId,
            dayIndex: 3,
          },
        }),
        'PUT /api/program-workouts/{id}',
      );

      expect(Number(updated.data?.id)).toBe(relationId);
      expect(Number(updated.data?.programId)).toBe(programId);
      expect(Number(updated.data?.workoutId)).toBe(workoutId);
      expect(Number(updated.data?.dayIndex)).toBe(3);

      const updatedDb = await dbOne<{
        program_id: number;
        workout_id: number;
        day_index: number;
      }>(
        `
          SELECT program_id, workout_id, day_index
          FROM public.program_workouts
          WHERE id=$1
        `,
        [relationId],
      );
      expect(updatedDb).not.toBeNull();
      expect(Number(updatedDb?.program_id)).toBe(programId);
      expect(Number(updatedDb?.workout_id)).toBe(workoutId);
      expect(Number(updatedDb?.day_index)).toBe(3);

      await rejected(
        await api.post('/api/program-workouts', {
          data: {
            programId,
            workoutId,
            dayIndex: 3,
          },
        }),
        'duplicate same program/workout/dayIndex',
      );

      expect(
        await dbCount(
          `
            SELECT count(*)::text AS count
            FROM public.program_workouts
            WHERE program_id=$1 AND workout_id=$2 AND day_index=3
          `,
          [programId, workoutId],
        ),
      ).toBe(1);

      const second = await success(
        await api.post('/api/program-workouts', {
          data: {
            programId,
            workoutId,
            dayIndex: 5,
          },
        }),
        'POST same workout at another dayIndex',
      );

      secondRelationId = Number(second.data?.id);
      expect(secondRelationId).toBeGreaterThan(0);
      expect(secondRelationId).not.toBe(relationId);

      expect(
        await dbCount(
          `
            SELECT count(*)::text AS count
            FROM public.program_workouts
            WHERE program_id=$1 AND workout_id=$2
          `,
          [programId, workoutId],
        ),
      ).toBe(2);

      await success(
        await api.delete(`/api/program-workouts/id/${relationId}`),
        'DELETE /api/program-workouts/id/{id}',
      );

      expect(
        await dbCount(
          'SELECT count(*)::text AS count FROM public.program_workouts WHERE id=$1',
          [relationId],
        ),
      ).toBe(0);
      relationId = undefined;

      await success(
        await api.delete(`/api/program-workouts/${programId}/${workoutId}`),
        'DELETE /api/program-workouts/{programId}/{workoutId}',
      );

      expect(
        await dbCount(
          'SELECT count(*)::text AS count FROM public.program_workouts WHERE id=$1',
          [secondRelationId],
        ),
      ).toBe(0);
      secondRelationId = undefined;

      const finalAssigned = await success(
        await api.get(`/api/program-workouts/workouts/${workoutId}/assigned`),
        'GET assigned after delete',
      );
      expect(finalAssigned.data?.assigned).toBe(false);

      await deleteProgram(api, programId);
      programId = undefined;

      await deleteWorkout(api, workoutId);
      workoutId = undefined;
    } finally {
      // A cleanup is intentionally API-only. If the backend cannot delete
      // its own test data, the test must expose that backend defect.
      if (relationId !== undefined) {
        await success(
          await api.delete(`/api/program-workouts/id/${relationId}`),
          `cleanup DELETE program-workout id=${relationId}`,
        );
      }

      if (secondRelationId !== undefined) {
        await success(
          await api.delete(`/api/program-workouts/id/${secondRelationId}`),
          `cleanup DELETE program-workout id=${secondRelationId}`,
        );
      }

      if (programId !== undefined) {
        const remaining = await dbCount(
          'SELECT count(*)::text AS count FROM public.program_workouts WHERE program_id=$1',
          [programId],
        );

        if (remaining > 0) {
          await success(
            await api.delete(`/api/program-workouts/${programId}`),
            `cleanup DELETE all program-workouts program=${programId}`,
          );
        }

        await deleteProgram(api, programId);
      }

      if (workoutId !== undefined) {
        await deleteWorkout(api, workoutId);
      }

      await api.dispose();
    }
  });

  test('NEGATIVE: nem létező program/workout kapcsolat nem hoz létre DB rekordot', async ({
    page,
  }) => {
    await login(page, 'coach');
    const api = await apiFor(page);

    const invalidProgramId = 2147483001;
    const invalidWorkoutId = 2147483002;

    try {
      expect(
        await dbCount(
          `
            SELECT count(*)::text AS count
            FROM public.program_workouts
            WHERE program_id=$1 OR workout_id=$2
          `,
          [invalidProgramId, invalidWorkoutId],
        ),
      ).toBe(0);

      await rejected(
        await api.post('/api/program-workouts', {
          data: {
            programId: invalidProgramId,
            workoutId: invalidWorkoutId,
            dayIndex: 1,
          },
        }),
        'POST invalid program-workout',
      );

      expect(
        await dbCount(
          `
            SELECT count(*)::text AS count
            FROM public.program_workouts
            WHERE program_id=$1 OR workout_id=$2
          `,
          [invalidProgramId, invalidWorkoutId],
        ),
      ).toBe(0);

      await rejected(
        await api.put(`/api/program-workouts/${invalidProgramId}`, {
          data: {
            id: invalidProgramId,
            programId: invalidProgramId,
            workoutId: invalidWorkoutId,
            dayIndex: 1,
          },
        }),
        'PUT invalid program-workout',
      );

      await rejected(
        await api.delete(`/api/program-workouts/id/${invalidProgramId}`),
        'DELETE invalid program-workout id',
      );
    } finally {
      await api.dispose();
    }
  });
});
