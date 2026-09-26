/** Backend request DTO for assigning a workout to a program. */
export interface ProgramWorkoutAssignmentRequest {
  programId: number;
  workoutId: number;
  dayIndex: number;
}
