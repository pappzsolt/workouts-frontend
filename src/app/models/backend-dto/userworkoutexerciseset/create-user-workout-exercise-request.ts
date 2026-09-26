/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
import type { CreateExerciseSetRequest } from './create-exercise-set-request';

export interface CreateUserWorkoutExerciseRequest {
  userWorkoutId: number | null;
  workoutExerciseId: number | null;
  sets: Array<CreateExerciseSetRequest> | null;
}
