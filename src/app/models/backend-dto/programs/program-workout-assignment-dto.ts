/** Backend DTO for the program-workout assignment endpoints. */
export interface ProgramWorkoutAssignmentDto {
  id: number | null;
  programId: number | null;
  workoutId: number | null;
  dayIndex: number | null;
}
