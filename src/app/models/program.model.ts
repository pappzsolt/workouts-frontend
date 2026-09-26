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
  workouts?: ProgramWorkout[];
}

export interface ProgramWorkout {
  workoutId: number;
  exercises?: ProgramExercise[];
}

export interface ProgramExercise {
  exerciseId: number;
  orderIndex?: number;
}

import type { ApiResponse } from './backend-dto/common/api-response';
export type { ApiResponse } from './backend-dto/common/api-response';

/**
 * A bejelentkezett coach programjainak válasza.
 */
export type CoachProgramsResponse = ApiResponse<Program[]>;

/**
 * Lapozott backend válasz program kereséshez.
 * A Spring Page válasz releváns mezői.
 */
export interface CoachProgramSearchItem {
  programId: number;
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
  workouts?: ProgramWorkout[];
}

export interface CoachProgramSearchResponse {
  content: CoachProgramSearchItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/**
 * A bejelentkezett userhez rendelt program.
 */
export interface UserProgramApiItem {
  id: number;
  name: string;
  description: string;
  startDate?: string | null;
  endDate?: string | null;
  durationDays: number;
  difficulty: string;
  status: string;
  assignedAt: string;
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
