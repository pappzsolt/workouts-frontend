// src/app/models/exercise.model.ts

export interface Exercise {
  id?: number;

  // ==========================================================
  // FORDÍTOTT ADATOK
  // ==========================================================

  name: string;
  description?: string;
  bodyPart?: string;
  synonyms?: string;
  instructions?: string;
  tips?: string;
  primaryMuscles?: string;
  secondaryMuscles?: string;

  // ==========================================================
  // KÖZÖS EXERCISE ADATOK
  // ==========================================================

  imageUrl?: string;
  videoUrl?: string;
  muscleGroup?: string;
  equipment?: string;
  difficultyLevel?: string;
  category?: string;
  caloriesBurnedPerMinute?: number;
  durationSeconds?: number;
  done?: boolean;
  forceType?: string;
  mechanic?: string;
  isUnilateral?: boolean;
  isBodyweight?: boolean;
  variationGroup?: string;

  // ==========================================================
  // A MEGLÉVŐ COACH FELÜLET HASZNÁLJA
  // ==========================================================

  sets?: number;
  repetitions?: number;
  duration_minutes?: number;
  intensity_level?: string;
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

export interface ExerciseSearchResponse {
  content: Exercise[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
