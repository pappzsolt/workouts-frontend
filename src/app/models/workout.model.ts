export interface Workout {
  id?: number;
  workoutName: string;
  description?: string;
  durationMinutes?: number;
  difficultyLevel?: string;
  programId?: number;
}

export interface WorkoutResponse {
  status: string;
  message: string;
}
