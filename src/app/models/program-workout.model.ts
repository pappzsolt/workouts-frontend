export interface ProgramWorkout {
  id?: number;
  programId: number;
  workoutId: number;
  dayIndex: number;
}


export interface ProgramWorkoutResponse {
  status: string;
  message: string;
}
