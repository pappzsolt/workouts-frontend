import { WorkoutExercise } from './exercise.model';

export interface Workout {
  id?: number;
  workoutName?: string;
  name?: string;
  description?: string;
  durationMinutes?: number;
  difficultyLevel?: string;
  programId?: number;

  workoutDescription?: string;
  workoutDate?: string;
  intensityLevel?: string;
  dayIndex?: number;
  completed?: boolean;
  performedAt?: string;
  actualSets?: number;
  actualRepetitions?: number;
  weightUsed?: number;
  durationSeconds?: number;
  feedback?: string;
  notes?: string;
  done?: boolean;

  // Workouthoz tartozó gyakorlatok
  exercises?: WorkoutExercise[];
}

export interface WorkoutResponse {
  status: string;
  message: string;
  data?: Workout;
}

export interface WorkoutListResponse {
  status: string;
  workouts: Workout[];
  message?: string;
}
