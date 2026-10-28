import { normalizeIntensity } from '../../../../../constants/intensity';
import type { Exercise, WorkoutWithExercises } from '../../../../../models/exercise.model';
import type { UserWorkoutDto } from '../../../../../models/backend-dto/workout/user-workout-dto';
import type { Workout } from '../../../../../models/workout.model';
import type { WorkoutExerciseView } from '../../../../../models/workout/workout-exercise-view.model';
import { toExercise } from '../../../../../services/shared/exercise-mapping';

/** Az űrlap üres kiinduló állapota. */
export function emptyWorkout(): Workout {
  return {
    name: '', workoutName: '', description: '', workoutDescription: '', durationMinutes: undefined,
    difficultyLevel: '', programId: undefined, workoutDate: undefined, intensityLevel: undefined, dayIndex: undefined,
    completed: undefined, performedAt: undefined, actualSets: undefined, actualRepetitions: undefined,
    weightUsed: undefined, durationSeconds: undefined, feedback: undefined, notes: undefined, done: undefined,
  };
}

/** A backendtől kapott edzés az űrlap modelljében (a nem kapott mezők a jelenlegiből maradnak). */
export function workoutFromDto(current: Workout, w: UserWorkoutDto): Workout {
  return {
    ...current,
    id: w.workoutId ?? current.id,
    name: w.workoutName ?? '',
    workoutName: w.workoutName ?? '',
    description: w.workoutDescription ?? '',
    workoutDescription: w.workoutDescription ?? '',
    durationMinutes: w.durationMinutes ?? undefined,
    workoutDate: w.workoutDate ? w.workoutDate.split('T')[0] : undefined,
    intensityLevel: normalizeIntensity(w.intensityLevel) || undefined,
    done: w.done ?? undefined,
    programId: w.programId ?? undefined,
    dayIndex: w.dayIndex ?? undefined,
    completed: w.completed ?? undefined,
    performedAt: w.performedAt ?? undefined,
    actualSets: w.actualSets ?? undefined,
    actualRepetitions: w.actualRepetitions ?? undefined,
    weightUsed: w.weightUsed ?? undefined,
    durationSeconds: w.durationSeconds ?? undefined,
    feedback: w.feedback ?? undefined,
    notes: w.notes ?? undefined,
    exercises: [],
  };
}

/** Az edzés gyakorlatai a lista nézetéhez, sorrend szerint. */
export function toWorkoutExerciseViews(workout: WorkoutWithExercises, workoutId: number): WorkoutExerciseView[] {
  return (workout.exercises ?? [])
    .filter((item) => item.id != null && item.workoutId != null)
    .map((item) => ({
      id: item.id ?? undefined,
      workoutId: item.workoutId ?? workoutId,
      exerciseId: item.exercise?.id ?? undefined,
      exercise: item.exercise ? toExercise(item.exercise) : undefined,
      sets: item.sets ?? undefined,
      repetitions: item.repetitions ?? undefined,
      orderIndex: item.orderIndex ?? undefined,
      restSeconds: item.restSeconds ?? undefined,
      notes: item.notes ?? undefined,
      done: item.done ?? undefined,
      name: item.exercise?.name ?? undefined,
    }))
    .sort((x, y) => (x.orderIndex ?? 0) - (y.orderIndex ?? 0));
}

/** A lista elemének gyakorlat-azonosítója (beágyazott gyakorlat, exerciseId vagy maga az elem). */
export function exerciseIdOf(view: WorkoutExerciseView): number | null {
  if (!view) return null;
  if (view.exercise?.id != null) return Number(view.exercise.id);
  if (view.exerciseId != null) return Number(view.exerciseId);
  if (view.name != null && view.id != null) return Number(view.id);
  return null;
}

export function containsExercise(views: WorkoutExerciseView[], exerciseId: number): boolean {
  return views.some((view) => {
    const existing = exerciseIdOf(view);
    return existing != null && existing === Number(exerciseId);
  });
}

/** A még hozzá nem adott gyakorlatok a keresés szerint, név szerint rendezve. */
export function selectableExercises(
  exercises: Exercise[], added: WorkoutExerciseView[], searchTerm: string, locale: string,
): Exercise[] {
  const search = searchTerm.trim().toLocaleLowerCase(locale);
  return exercises
    .filter((exercise) => exercise.id != null && !containsExercise(added, exercise.id))
    .filter((exercise) => !search || (exercise.name || '').toLocaleLowerCase(locale).includes(search))
    .sort((a, b) => (a.name || '').trim().localeCompare((b.name || '').trim(), locale, { sensitivity: 'base' }));
}
