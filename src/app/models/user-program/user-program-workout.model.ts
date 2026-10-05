/** UserProgramWorkout frontend model. */
import type { UserProgramExercise } from './user-program-exercise.model';
export interface UserProgramWorkout {
  userWorkoutId?: number;
  programWorkoutId?: number;
  workoutId: number;
  workoutName?: string | null;
  scheduledAt: string | null;
  workoutCompleted: boolean;
  exercises: UserProgramExercise[];

}
