/** UserProgramExercise frontend model. */
export interface UserProgramExercise {
  userWorkoutExerciseId?: number;
  workoutExerciseId?: number;
  order?: number;
  exerciseId?: number;
  exerciseName?: string | null;
  exerciseCompleted: boolean;
  setsDone?: number | null;
  feedback?: string | null;
  notes?: string | null;
  performedAt?: string | null;

}
