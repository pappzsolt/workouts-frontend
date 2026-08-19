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

export interface UserWorkoutExerciseSetDto {
  id: number;
  userWorkoutExerciseId: number;

  setNumber: number;

  targetRepetitions: number;
  targetWeightKg: number | null;

  actualRepetitions: number | null;
  actualWeightKg: number | null;

  startedAt: string | null;
  completedAt: string | null;

  completed: boolean;

  notes: string | null;
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

  userWorkoutExerciseId: number | null;

  // EZ A BACKEND MEZŐNEVE
  userWorkoutExerciseSets: UserWorkoutExerciseSetDto[];
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
