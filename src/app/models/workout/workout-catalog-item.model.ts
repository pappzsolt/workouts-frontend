import type { WorkoutExercise } from '../exercise.model';

/** Coach-owned workout template metadata; user progress belongs to UserWorkoutOccurrence. */
export interface WorkoutCatalogItem {
  id?: number;
  name?: string;
  description?: string;
  workoutDate?: string;
  durationMinutes?: number;
  intensityLevel?: string;
  done?: boolean;
  exercises?: WorkoutExercise[];
}
