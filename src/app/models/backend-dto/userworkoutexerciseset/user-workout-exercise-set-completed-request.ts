/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
export interface UserWorkoutExerciseSetCompletedRequest {
  userWorkoutId: number | null;
  programId: number | null;
  workoutId: number | null;
  exerciseId: number | null;
  setId: number | null;
  completed: boolean | null;
  actualRepetitions: number | null;
  actualWeightKg: number | null;
  notes: string | null;
}
