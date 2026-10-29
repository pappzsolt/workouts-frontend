import type { Exercise, WorkoutWithExercises } from '../../../../../models/exercise.model';
import type { WorkoutExerciseView } from '../../../../../models/workout/workout-exercise-view.model';
import { toExercise } from '../../../../../services/shared/exercise-mapping';

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
