// src/app/models/exercise.model.ts
export interface Exercise {
  id?: number;
  name: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  muscleGroup?: string;
  equipment?: string;
  difficultyLevel?: string;
  category?: string;
  caloriesBurnedPerMinute?: number;
  durationSeconds?: number;

  // 👇 ADD THESE FIELDS (used in your component)
  sets?: number;
  repetitions?: number;
  duration_minutes?: number;
  intensity_level?: string;
  workoutId?: number;
  done?: boolean;
}


export interface WorkoutExercise {
  id: number;
  workoutId: number;
  exercise: Exercise;
  sets: number;
  repetitions: number;
  orderIndex: number;
  restSeconds: number;
  notes?: string;
  done: boolean;
}

export interface WorkoutDto {
  id: number;
  name: string;
  description: string;
  workoutDate?: string;
  durationMinutes?: number;
  intensityLevel?: string;
  done?: boolean;
  exercises: WorkoutExercise[];
}
