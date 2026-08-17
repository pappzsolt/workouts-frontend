export interface ExerciseDetailDto {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  videoUrl: string | null;
  muscleGroup: string;
  equipment: string;
  difficultyLevel: string;
  category: string;
  caloriesBurnedPerMinute: number | null;
  durationSeconds: number;
}

export interface UserWorkoutExerciseDetailDto {
  id: number;
  workoutId: number;

  exercise: ExerciseDetailDto;

  sets: number;
  repetitions: number;
  orderIndex: number;
  restSeconds: number;

  notes: string | null;
  done: boolean;
}

export interface UserWorkoutDetailDto {
  id: number;
  name: string;
  description: string;

  workoutDate?: string | null;
  durationMinutes?: number | null;
  intensityLevel?: string | null;
  done?: boolean | null;

  exercises: UserWorkoutExerciseDetailDto[];
}
