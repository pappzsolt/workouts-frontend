/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
import type { WorkoutExerciseResponse } from './workout-exercise-response';

export interface ProgramWorkoutResponse {
  id: number | null;
  name: string | null;
  workoutDate: string | null;
  durationMinutes: number | null;
  intensityLevel: string | null;
  exercises: Array<WorkoutExerciseResponse> | null;
}
