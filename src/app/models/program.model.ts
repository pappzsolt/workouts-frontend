export interface Program {
  id?: number;

  programName?: string;
  programDescription?: string;

  name?: string;
  description?: string;

  coachId?: number;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  difficultyLevel?: string;
  workoutCount?: number;
  workouts?: ProgramWorkoutSummary[];
}

export interface ProgramWorkoutSummary {
  workoutId: number;
  exercises?: ProgramExercise[];
}

export interface ProgramExercise {
  exerciseId: number;
  orderIndex?: number;
}

export interface UserProgram {
  id: number;
  name: string | null;
  description: string | null;
  startDate?: string | null;
  endDate?: string | null;
  durationWeeks: number;
  difficulty: string | null;
  status: string | null;
  assignedAt: string | null;
}

/**
 * Egy program workout-alapú haladása.
 */
export interface ProgramProgress {
  programId: number;
  completedWorkouts: number;
  totalWorkouts: number;
  progressPercent: number;
}
