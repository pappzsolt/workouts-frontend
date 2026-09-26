/**
 * Közös frontend típusok.
 *
 * Az alkalmazásban az interface deklarációk a models könyvtárban vannak.
 */

export interface SelectOption {
  value: string;
  label: string;
}

export interface MenuItem {
  label: string;
  path?: string;
  children?: MenuItem[];
  open?: boolean;
  action?: string;
}

export interface WorkoutExerciseView {
  id?: number;
  workoutId: number;
  exerciseId?: number;
  exercise?: import('./exercise.model').Exercise;
  sets?: number;
  repetitions?: number;
  orderIndex?: number;
  restSeconds?: number;
  notes?: string;
  done?: boolean;
  name?: string;
}

export interface UserProgramExerciseRow {
  scheduled_date?: string | null;
  scheduledAt?: string | null;
  program_day_index?: number;
  user_workout_id?: number;
  userWorkoutId?: number;
  program_workout_id?: number;
  programWorkoutId?: number;
  workout_id?: number;
  workoutId?: number;
  workout_name?: string | null;
  workoutName?: string | null;
  workout_completed?: boolean;
  workoutCompleted?: boolean;
  user_workout_exercise_id?: number;
  workout_exercise_id?: number;
  exercise_order?: number;
  exercise_id?: number;
  exerciseName?: string | null;
  exercise_name?: string | null;
  exercise_completed?: boolean;
  sets_done?: number | null;
  feedback?: string | null;
  notes?: string | null;
  performed_at?: string | null;
}

export interface UserProgramExercise {
  userWorkoutExerciseId?: number;
  workoutExerciseId?: number;
  order?: number;
  exerciseId?: number;
  exerciseName?: string | null;
  exerciseCompleted: boolean;
  setsDone?: number | null;
  feedback?: string | null;
  notes?: string | null;
  performedAt?: string | null;
}

export interface UserProgramWorkout {
  userWorkoutId?: number;
  programWorkoutId?: number;
  workoutId: number;
  workoutName?: string | null;
  scheduledAt: string | null;
  workoutCompleted: boolean;
  exercises: UserProgramExercise[];
}

export interface UserProgramDay {
  date?: string | null;
  programDayIndex?: number;
  workouts: UserProgramWorkout[];
}

export interface CalendarDay {
  date: Date;
  currentMonth: boolean;
  isToday: boolean;
}

export interface NavigationHistoryEntry {
  url: string;
  state: Record<string, unknown>;
}

export interface UserNameId {
  id: number;
  username: string;
}

export interface CoachNameId {
  id: number;
  name: string;
}

export interface ScheduledWorkout {
  userWorkoutId: number;
  programWorkoutId: number;
  workoutId: number;
  programId: number;
  scheduledAt: string | null;
  completed: boolean | null;
  workoutName?: string | null;
}

export interface RawWorkoutRecord extends Partial<import('./user-workout-occurrence.model').UserWorkoutOccurrence> {
  id?: number;
  workout_id?: number;
  program_workout_id?: number;
  user_workout_id?: number;
}

export interface RawScheduledWorkout extends Partial<ScheduledWorkout> {
  user_workout_id?: number;
  program_workout_id?: number;
  workout_id?: number;
  program_id?: number;
  scheduled_at?: string | null;
  workout_name?: string | null;
}

export interface ScheduledWorkoutRecord {
  userWorkoutId?: number;
  user_workout_id?: number;
  programWorkoutId?: number;
  program_workout_id?: number;
  workoutId?: number;
  workout_id?: number;
  programId?: number;
  program_id?: number;
  scheduledAt?: string | null;
  scheduled_at?: string | null;
  completed?: boolean | null;
  workoutName?: string | null;
  workout_name?: string | null;
}