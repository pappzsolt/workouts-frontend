/** ScheduledWorkout frontend model. */
export interface ScheduledWorkout {
  userWorkoutId: number;
  programWorkoutId: number;
  workoutId: number;
  programId: number;
  scheduledAt: string | null;
  completed: boolean | null;
  workoutName?: string | null;

}
