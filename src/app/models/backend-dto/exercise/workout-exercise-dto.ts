/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
import type { ExerciseDto } from './exercise-dto';

export interface WorkoutExerciseDto {
  id: number | null;
  workoutId: number | null;
  exercise: ExerciseDto | null;
  sets: number | null;
  repetitions: number | null;
  orderIndex: number | null;
  restSeconds: number | null;
  notes: string | null;
  done: boolean | null;
  userWorkoutExerciseId: number | null;
}
