import type { ScheduledWorkout } from '../../models/scheduled-workout/scheduled-workout.model';
import type { ScheduledWorkoutRecord } from '../../models/scheduled-workout/scheduled-workout-record.model';

type PreferredFields = Pick<ScheduledWorkoutRecord, 'userWorkoutId' | 'scheduledAt' | 'workoutName'>;

function toScheduledWorkout(item: ScheduledWorkoutRecord, preferred: PreferredFields): ScheduledWorkout | null {
  const userWorkoutId = Number(preferred.userWorkoutId);
  const programWorkoutId = Number(item.programWorkoutId ?? item.program_workout_id);
  const workoutId = Number(item.workoutId ?? item.workout_id);
  const programId = Number(item.programId ?? item.program_id);
  if (
    !Number.isFinite(userWorkoutId) || userWorkoutId <= 0 ||
    !Number.isFinite(programWorkoutId) || programWorkoutId <= 0 ||
    !Number.isFinite(workoutId) || workoutId <= 0 ||
    !Number.isFinite(programId) || programId <= 0
  ) return null;
  return {
    userWorkoutId, programWorkoutId, workoutId, programId,
    scheduledAt: preferred.scheduledAt ?? null,
    completed: item.completed ?? null,
    workoutName: preferred.workoutName ?? null,
  };
}

/** Calendar API consumers prefer camelCase fields when both spellings are present. */
export function toCalendarScheduledWorkouts(items: ScheduledWorkoutRecord[]): ScheduledWorkout[] {
  return items.map(item => toScheduledWorkout(item, {
    userWorkoutId: item.userWorkoutId ?? item.user_workout_id,
    scheduledAt: item.scheduledAt ?? item.scheduled_at,
    workoutName: item.workoutName ?? item.workout_name,
  })).filter((item): item is ScheduledWorkout => item !== null);
}

/** The user-workout consumer prefers snake_case for occurrence ID, date and name. */
export function toUserScheduledWorkouts(items: ScheduledWorkoutRecord[]): ScheduledWorkout[] {
  return items.map(item => toScheduledWorkout(item, {
    userWorkoutId: item.user_workout_id ?? item.userWorkoutId,
    scheduledAt: item.scheduled_at ?? item.scheduledAt,
    workoutName: item.workout_name ?? item.workoutName,
  })).filter((item): item is ScheduledWorkout => item !== null);
}
