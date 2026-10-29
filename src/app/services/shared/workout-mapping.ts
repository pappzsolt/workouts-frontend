import { normalizeIntensity } from '../../constants/intensity';
import type { WorkoutDto as BackendWorkoutDto } from '../../models/backend-dto/exercise/workout-dto';
import type { UserWorkoutDto } from '../../models/backend-dto/workout/user-workout-dto';
import type { WorkoutRequest } from '../../models/backend-dto/workout/workout-request';
import type { WorkoutWithExercises } from '../../models/exercise.model';
import type { WorkoutForm } from '../../models/workout/workout-form.model';
import type { WorkoutCatalogItem } from '../../models/workout/workout-catalog-item.model';
import { type CompleteWorkoutExerciseDto, toWorkoutExercise } from './exercise-mapping';

/** Empty coach workout template form. */
export function emptyWorkoutForm(): WorkoutForm {
  return {
    name: '', description: '', workoutDate: undefined, durationMinutes: undefined,
    intensityLevel: undefined, dayIndex: undefined, done: undefined,
  };
}

/** The legacy detail endpoint uses UserWorkoutDto even for a coach-owned template. */
export function toWorkoutForm(current: WorkoutForm, workout: UserWorkoutDto): WorkoutForm {
  return {
    id: workout.workoutId ?? current.id,
    name: workout.workoutName ?? '',
    description: workout.workoutDescription ?? '',
    workoutDate: workout.workoutDate ? workout.workoutDate.split('T')[0] : undefined,
    durationMinutes: workout.durationMinutes ?? undefined,
    intensityLevel: normalizeIntensity(workout.intensityLevel) || undefined,
    dayIndex: workout.dayIndex ?? undefined,
    done: workout.done ?? undefined,
  };
}

/** Coach template payload: absent fields and nonpositive durations are sent as null. */
export function toWorkoutRequest(workout: WorkoutForm, id = workout.id ?? null): WorkoutRequest {
  return {
    id,
    name: workout.name ?? null,
    description: workout.description ?? null,
    workoutDate: workout.workoutDate ?? null,
    durationMinutes: workout.durationMinutes != null && workout.durationMinutes > 0 ? workout.durationMinutes : null,
    intensityLevel: workout.intensityLevel ?? null,
    dayIndex: workout.dayIndex ?? null,
    done: workout.done ?? null,
  };
}

/** Workout metadata returned by the coach catalogue endpoints. */
export function toWorkoutCatalogItem(workout: BackendWorkoutDto): WorkoutCatalogItem {
  return {
    id: workout.id ?? undefined,
    name: workout.name ?? undefined,
    description: workout.description ?? undefined,
    workoutDate: workout.workoutDate ?? undefined,
    durationMinutes: workout.durationMinutes ?? undefined,
    intensityLevel: workout.intensityLevel ?? undefined,
    done: workout.done ?? undefined,
    exercises: [],
  };
}

/** Library details include only workout exercises with their IDs and nested exercise data. */
export function toWorkoutWithExercises(workout: BackendWorkoutDto): WorkoutWithExercises {
  return {
    id: workout.id ?? 0,
    programNames: workout.programNames ?? [],
    name: workout.name ?? '',
    description: workout.description ?? '',
    workoutDate: workout.workoutDate ?? undefined,
    durationMinutes: workout.durationMinutes ?? undefined,
    intensityLevel: workout.intensityLevel ?? undefined,
    done: workout.done ?? undefined,
    exercises: (workout.exercises ?? [])
      .filter((item): item is CompleteWorkoutExerciseDto =>
        item.id != null && item.workoutId != null && item.exercise != null)
      .map(toWorkoutExercise),
  };
}
