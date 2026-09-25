export interface ProgramWorkout {
  /** A program_workout occurrence elsődleges azonosítója. */
  id?: number;
  programId: number;
  workoutId: number;
  dayIndex: number;
}

export interface ProgramWorkoutResponse {
  status: string;
  message: string;
}

export interface ProgramWorkoutListResponse {
  status: string;
  data: ProgramWorkout[];
}
