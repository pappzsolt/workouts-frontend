// models/user-workout-exercise-set.model.ts

export interface UserWorkoutExerciseSetModel {
  id?: number;

  userWorkoutExerciseId: number;

  setNumber: number;

  targetRepetitions: number;
  targetWeightKg?: number | null;

  actualRepetitions?: number | null;
  actualWeightKg?: number | null;

  startedAt?: string | null;
  completedAt?: string | null;

  completed: boolean;

  notes?: string | null;
}
