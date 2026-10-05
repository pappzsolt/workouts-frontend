/** UserProgramDay frontend model. */
import type { UserProgramWorkout } from './user-program-workout.model';
export interface UserProgramDay {
  date?: string | null;
  programDayIndex?: number;
  workouts: UserProgramWorkout[];

}
