/** Editable template fields sent by the coach workout create and edit forms. */
export interface WorkoutForm {
  id?: number;
  name: string;
  description: string;
  workoutDate?: string;
  durationMinutes?: number | null;
  intensityLevel?: string;
  dayIndex?: number;
  done?: boolean;
}
