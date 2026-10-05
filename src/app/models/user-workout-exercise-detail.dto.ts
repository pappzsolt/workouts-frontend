import type { ExerciseDetailDto } from './backend-dto/exercise/exercise-detail-dto';
import type { UserWorkoutExerciseSetDto } from './backend-dto/userworkoutexerciseset/user-workout-exercise-set-dto';

/** UI composite model. Nested API objects use the canonical backend DTOs. */
export interface UserWorkoutExerciseDetailDto {
  id: number;
  workoutId: number;

  exercise: ExerciseDetailDto;

  sets: number;
  repetitions: number;
  orderIndex: number;
  restSeconds: number;

  notes: string | null;
  done: boolean;

  userWorkoutExerciseId: number | null;

  userWorkoutExerciseSets: UserWorkoutExerciseSetDto[];
}

/** UI composite model for the workout detail response. */
export interface UserWorkoutDetailDto {
  id: number;
  name: string;
  description: string;

  workoutDate?: string | null;
  durationMinutes?: number | null;
  intensityLevel?: string | null;
  done?: boolean | null;

  exercises: UserWorkoutExerciseDetailDto[];
}

export type { ExerciseDetailDto, UserWorkoutExerciseSetDto };
