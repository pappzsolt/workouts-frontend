/** Raw workout record returned by workout occurrence endpoints. */
export interface RawWorkoutRecord {
  id?: number;
  workout_id?: number;
  workoutId?: number;
  program_workout_id?: number;
  programWorkoutId?: number;
  user_workout_id?: number;
  userWorkoutId?: number;

  workout_name?: string | null;
  workoutName?: string | null;
  workout_description?: string | null;
  workoutDescription?: string | null;
  workout_date?: string | null;
  workoutDate?: string | null;
  duration_minutes?: number | null;
  durationMinutes?: number | null;
  intensity_level?: string | null;
  intensityLevel?: string | null;
  day_index?: number | null;
  dayIndex?: number | null;

  completed?: boolean | null;
  performed_at?: string | null;
  performedAt?: string | null;
  actual_sets?: number | null;
  actualSets?: number | null;
  actual_repetitions?: number | null;
  actualRepetitions?: number | null;
  weight_used?: number | null;
  weightUsed?: number | null;
  duration_seconds?: number | null;
  durationSeconds?: number | null;
  feedback?: string | null;
  notes?: string | null;
}
