/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
import type { ProgramWorkoutResponse } from './program-workout-response';

export interface UserProgramResponse {
  id: number | null;
  name: string | null;
  description: string | null;
  workouts: Array<ProgramWorkoutResponse> | null;
}
