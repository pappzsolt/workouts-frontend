/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
export interface UpdateExerciseSetRequest {
  setNumber: number | null;
  targetRepetitions: number | null;
  targetWeightKg: number | null;
  actualRepetitions: number | null;
  actualWeightKg: number | null;
  completed: boolean | null;
  notes: string | null;
  clearTargetRepetitions: boolean;
  clearTargetWeightKg: boolean;
  clearActualRepetitions: boolean;
  clearActualWeightKg: boolean;
  clearNotes: boolean;
}
