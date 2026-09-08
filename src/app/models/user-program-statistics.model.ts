export interface ProgramStatisticsRow {
  programId: number;

  // Workout adatok
  workoutId: number;
  workoutName: string;
  workoutDescription?: string;
  workoutDate?: string;
  durationMinutes?: number;
  intensityLevel?: string;

  // User workout
  userWorkoutId: number;
  userWorkoutCompleted?: boolean;
  userWorkoutPerformedAt?: string;
  userWorkoutScheduledAt?: string;
  userWorkoutFeedback?: string;
  userWorkoutNotes?: string;

  // Exercise
  exerciseId: number;
  exerciseName: string;
  muscleGroup?: string;
  equipment?: string;
  difficultyLevel?: string;
  category?: string;

  // User workout exercise
  userWorkoutExerciseId: number;
  userWorkoutExerciseCompleted?: boolean;
  userWorkoutExercisePerformedAt?: string;
  userWorkoutExerciseFeedback?: string;
  userWorkoutExerciseNotes?: string;
  setsDone?: number;

  // Set
  setId: number;
  setNumber: number;
  targetRepetitions?: number;
  targetWeightKg?: number;
  actualRepetitions?: number;
  actualWeightKg?: number;
  setStartedAt?: string;
  setCompletedAt?: string;
  setCompleted?: boolean;
  setNotes?: string;
}

// ============================================================
// FRONTEND CSOPORTOSÍTOTT ADATOK
// ============================================================

export interface ProgramStatisticsWorkout {
  workoutId: number;
  workoutName: string;
  workoutDescription?: string;
  workoutDate?: string;
  durationMinutes?: number;
  intensityLevel?: string;

  userWorkoutId: number;
  userWorkoutCompleted?: boolean;
  userWorkoutPerformedAt?: string;
  userWorkoutScheduledAt?: string;
  userWorkoutFeedback?: string;
  userWorkoutNotes?: string;

  exercises: ProgramStatisticsExercise[];
}

export interface ProgramStatisticsExercise {
  exerciseId: number;
  exerciseName: string;
  muscleGroup?: string;
  equipment?: string;
  difficultyLevel?: string;
  category?: string;

  userWorkoutExerciseId: number;
  userWorkoutExerciseCompleted?: boolean;
  userWorkoutExercisePerformedAt?: string;
  userWorkoutExerciseFeedback?: string;
  userWorkoutExerciseNotes?: string;
  setsDone?: number;

  sets: ProgramStatisticsSet[];

  // Fejlődés
  startWeight?: number;
  currentWeight?: number;
  weightChange?: number;

  startRepetitions?: number;
  currentRepetitions?: number;
  repetitionsChange?: number;
}

export interface ProgramStatisticsSet {
  setId: number;
  setNumber: number;

  targetRepetitions?: number;
  targetWeightKg?: number;

  actualRepetitions?: number;
  actualWeightKg?: number;

  setStartedAt?: string;
  setCompletedAt?: string;
  setCompleted?: boolean;
  setNotes?: string;
}
