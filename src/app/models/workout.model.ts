export interface Workout {
  id?: number;
  workoutName?: string;
  name?: string;          // backend name mező
  description?: string;
  durationMinutes?: number;
  difficultyLevel?: string;
  programId?: number;
}


export interface WorkoutResponse {
  status: string;
  message: string;
}
export interface WorkoutListResponse {
  status: string;
  workouts: Workout[];
  message?: string;
}
