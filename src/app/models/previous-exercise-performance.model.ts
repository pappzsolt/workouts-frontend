export interface PreviousExercisePerformance {
  userWorkoutId: number;
  performedAt: string;
  sets: Array<{
    setNumber: number;
    actualRepetitions: number | null;
    actualWeightKg: number | null;
  }>;
}
