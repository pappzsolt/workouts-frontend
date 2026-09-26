export interface Program {
  id?: number;

  programName?: string;
  programDescription?: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  difficultyLevel?: string;
  workoutCount?: number;
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
