/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
import type { ExerciseRequest } from '../exercise/exercise-request';
import type { WorkoutRequest } from '../workout/workout-request';

export interface ProgramCreationRequest {
  userId: number | null;
  programName: string | null;
  programDescription: string | null;
  durationDays: number | null;
  startDate: string | null;
  difficultyLevel: string | null;
  languageCode: string | null;
  workouts: Array<WorkoutRequest> | null;
  workoutId: number | null;
  exercises: Array<ExerciseRequest> | null;
  exerciseId: number | null;
  orderIndex: number | null;
}
