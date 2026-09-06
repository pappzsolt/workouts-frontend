export interface WorkoutCopyRequest {
  sourceWorkoutId: number;
  programId: number;
  workoutName: string;
  workoutDate: string;
  dayIndex: number;
}

export interface WorkoutCopyResponse {
  status: string;
  data: number | null;
  message: string | null;
}
