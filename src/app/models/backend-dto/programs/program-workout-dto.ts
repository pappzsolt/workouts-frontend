/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
import type { ExerciseDto } from '../exercise/exercise-dto';

export interface ProgramWorkoutDto {
  programWorkoutId: number | null;
  workoutId: number | null;
  name: string | null;
  description: string | null;
  exercises: Array<ExerciseDto> | null;
}
