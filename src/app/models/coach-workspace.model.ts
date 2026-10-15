/**
 * Az új coach felület (Áttekintés, Ügyfelek, Programok) backend szerződései.
 * A mezőnevek a backend JSON-t követik.
 */

// ------------------------------------------------------------
// GET /api/coach/overview
// ------------------------------------------------------------

export interface CoachOverview {
  from: string;
  to: string;
  clients: CoachClientOverview[];
}

export interface CoachClientOverview {
  userId: number;
  username: string;
  email: string;
  age: number | null;
  weight: number | null;
  height: number | null;
  gender: string | null;
  goals: string | null;
  lastCompletedAt: string | null;
  programs: CoachClientProgram[];
  workouts: CoachClientWorkout[];
}

export interface CoachClientProgram {
  programId: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  totalWorkouts: number;
  completedWorkouts: number;
}

export interface CoachClientWorkout {
  userWorkoutId: number;
  programId: number | null;
  workoutId: number;
  dayIndex: number | null;
  workoutName: string;
  programName: string;
  scheduledAt: string;
  completed: boolean;
  startedAt: string | null;
  performedAt: string | null;
}

/** A felületen használt edzés-állapot. */
export type CoachWorkoutStatus = 'done' | 'inProgress' | 'missed' | 'planned';

// ------------------------------------------------------------
// Programok
// ------------------------------------------------------------

export interface CoachProgramExercise {
  /** exercises.id */
  id: number;
  name: string;
  description: string | null;
  sets: number;
  repetitions: number;
  restSeconds: number;
  notes: string | null;
}

export interface CoachProgramWorkout {
  programWorkoutId: number;
  workoutId: number;
  name: string;
  description: string | null;
  exercises: CoachProgramExercise[];
}

export interface CoachProgram {
  programId: number;
  programName: string;
  programDescription: string | null;
  durationDays: number | null;
  difficultyLevel: string | null;
  startDate: string | null;
  endDate: string | null;
  workouts: CoachProgramWorkout[];
}

export interface CoachProgramDayLink {
  /** program_workouts.id */
  id: number;
  programId: number;
  workoutId: number;
  dayIndex: number;
}

export interface CoachProgramDetailsInput {
  programName: string;
  programDescription: string | null;
  durationDays: number;
  difficultyLevel: string | null;
  startDate: string;
}

export interface CoachWorkoutSummary {
  id: number;
  name: string;
  description: string | null;
}

export interface CoachExerciseSearchItem {
  id: number;
  name: string;
  muscleGroup: string | null;
  equipment: string | null;
  bodyPart?: string | null;
  primaryMuscles?: string | null;
  description?: string | null;
  imageUrl?: string | null;
}

export interface CoachExerciseQuery {
  search: string;
  bodyPart: string;
  equipment: string;
  page: number;
  size: number;
}

export interface CoachExercisePage {
  items: CoachExerciseSearchItem[];
  totalElements: number;
  totalPages: number;
}

export interface CoachExerciseFilterOptions {
  bodyParts: string[];
  equipment: string[];
}

// ------------------------------------------------------------
// Ügyfél edzése (user_workout) és sorozatai
// ------------------------------------------------------------

/** GET /api/user-workout-exercises/workouts/{userWorkoutId} (snake_case). */
export interface ClientWorkoutExerciseRow {
  user_workout_exercise_id: number;
  workout_exercise_id: number;
  exercise_id: number;
  image_url: string | null;
  exercise_name: string;
  exercise_order: number;
  sets: number;
  repetitions: number;
  rest_seconds: number;
  completed: boolean;
}

/** GET /api/user-workout-exercise-sets/{userWorkoutExerciseId} */
export interface ClientWorkoutSet {
  id: number;
  userWorkoutExerciseId: number;
  setNumber: number;
  targetRepetitions: number;
  targetWeightKg: number | null;
  actualRepetitions: number | null;
  actualWeightKg: number | null;
  startedAt: string | null;
  completedAt: string | null;
  completed: boolean;
  notes: string | null;
  restSeconds: number | null;
}

/** GET /user-workout-exercises/user-programs/{userId}/{programId} egy sora (snake_case). */
export interface ClientProgramRow {
  scheduled_date: string | null;
  program_day_index: number | null;
  user_workout_id: number;
  program_workout_id: number | null;
  workout_id: number;
  workout_name: string | null;
  workout_exercise_id: number;
  exercise_id: number;
  exercise_name: string | null;
  exercise_order: number;
  workout_completed: boolean | null;
  user_workout_exercise_id: number;
  exercise_completed: boolean | null;
  sets_done: number | null;
  sets_completed?: number | null;
  workout_started_at?: string | null;
  workout_feedback?: string | null;
  exercise_feedback?: string | null;
  template_sets?: number | null;
  template_repetitions?: number | null;
  template_rest_seconds?: number | null;
}

export interface ClientSetValues {
  targetRepetitions: number;
  targetWeightKg: number | null;
  actualRepetitions: number | null;
  actualWeightKg: number | null;
  restSeconds: number | null;
  notes: string | null;
  completed: boolean;
}

export interface CoachApplyTemplateResult {
  userWorkouts: number;
  setsUpdated: number;
  setsAdded: number;
  setsRemoved: number;
}

export interface CoachProgramUsage {
  programId: number;
  name: string | null;
  startDate: string | null;
  endDate: string | null;
}
