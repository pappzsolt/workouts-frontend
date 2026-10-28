import type { Exercise, WorkoutExercise } from '../../models/exercise.model';
import type { ExerciseDto } from '../../models/backend-dto/exercise/exercise-dto';
import type { WorkoutExerciseDto } from '../../models/backend-dto/exercise/workout-exercise-dto';

/** A gyakorlat adatai a backendtől vagy egy már leképezett gyakorlatból; a null és a hiányzó érték egyaránt üres. */
export type ExerciseSource = { [K in keyof ExerciseDto]?: ExerciseDto[K] | undefined };

/** Egy edzés gyakorlata, amelynek az azonosítói és a gyakorlata megvannak. */
export type CompleteWorkoutExerciseDto = WorkoutExerciseDto & { id: number; workoutId: number; exercise: ExerciseDto };

/** A felület gyakorlata: a hiányzó értékek undefined-ok, a név ''. */
export function toExercise(exercise: ExerciseSource): Exercise {
  return {
    id: exercise.id ?? undefined,
    name: exercise.name ?? '',
    description: exercise.description ?? undefined,
    bodyPart: exercise.bodyPart ?? undefined,
    synonyms: exercise.synonyms ?? undefined,
    instructions: exercise.instructions ?? undefined,
    tips: exercise.tips ?? undefined,
    primaryMuscles: exercise.primaryMuscles ?? undefined,
    secondaryMuscles: exercise.secondaryMuscles ?? undefined,
    imageUrl: exercise.imageUrl ?? undefined,
    videoUrl: exercise.videoUrl ?? undefined,
    muscleGroup: exercise.muscleGroup ?? undefined,
    equipment: exercise.equipment ?? undefined,
    difficultyLevel: exercise.difficultyLevel ?? undefined,
    category: exercise.category ?? undefined,
    caloriesBurnedPerMinute: exercise.caloriesBurnedPerMinute ?? undefined,
    durationSeconds: exercise.durationSeconds ?? undefined,
    done: exercise.done ?? undefined,
    forceType: exercise.forceType ?? undefined,
    mechanic: exercise.mechanic ?? undefined,
    isUnilateral: exercise.isUnilateral ?? undefined,
    isBodyweight: exercise.isBodyweight ?? undefined,
    variationGroup: exercise.variationGroup ?? undefined,
  };
}

/** Egy edzés gyakorlata a felületnek: a hiányzó számok 0-k, a done false. */
export function toWorkoutExercise(item: CompleteWorkoutExerciseDto): WorkoutExercise {
  return {
    id: item.id,
    workoutId: item.workoutId,
    exercise: toExercise(item.exercise),
    sets: item.sets ?? 0,
    repetitions: item.repetitions ?? 0,
    orderIndex: item.orderIndex ?? 0,
    restSeconds: item.restSeconds ?? 0,
    notes: item.notes ?? undefined,
    done: item.done ?? false,
  };
}
