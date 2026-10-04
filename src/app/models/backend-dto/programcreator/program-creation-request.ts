/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */

export interface ProgramCreationExerciseRequest {
  exerciseId: number | null;
  orderIndex: number | null;
}

export interface ProgramCreationWorkoutRequest {
  workoutId: number | null;
  exercises: ProgramCreationExerciseRequest[] | null;
}

export interface ProgramCreationRequest {
  userId: number | null;
  programName: string | null;
  programDescription: string | null;
  durationDays: number | null;
  startDate: string | null;
  difficultyLevel: string | null;
  languageCode: string | null;
  workouts: ProgramCreationWorkoutRequest[] | null;
}
