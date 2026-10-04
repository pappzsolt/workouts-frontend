/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
import type { WorkoutExerciseDto } from './workout-exercise-dto';

export interface WorkoutDto {
  id: number | null;
  name: string | null;
  description: string | null;
  workoutDate: string | null;
  durationMinutes: number | null;
  intensityLevel: string | null;
  done: boolean | null;
  exercises: Array<WorkoutExerciseDto> | null;
}
