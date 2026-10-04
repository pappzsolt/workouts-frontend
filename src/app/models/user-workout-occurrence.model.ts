/** UI model for a user workout occurrence returned by the user-workouts screens. */
export interface UserWorkoutOccurrence {
  workoutId: number;
  workoutName: string;
  workoutDescription: string;
  workoutDate: string;
  durationMinutes: number;
  intensityLevel: string;
  dayIndex: number;
  programWorkoutId?: number;
  userWorkoutId?: number;
  completed: boolean | null;
  performedAt: string | null;
  actualSets: number | null;
  actualRepetitions: number | null;
  weightUsed: number | null;
  durationSeconds: number | null;
  feedback: string | null;
  notes: string | null;
}
