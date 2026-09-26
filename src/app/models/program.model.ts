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

/**
 * Egységes backend API válasz.
 *
 * Backend:
 *
 * {
 *   "success": true,
 *   "data": ...,
 *   "message": "..."
 * }
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string | null;
}

/**
 * A bejelentkezett coach programjainak válasza.
 */
export type CoachProgramsResponse = ApiResponse<Program[]>;

/**
 * Program DTO.
 */
export interface ProgramDto {
  programId: number;
  programName: string;
  programDescription: string;
  startDate?: string | null;
  endDate?: string | null;
  durationDays: number;
  difficultyLevel: string;
  workouts?: any[];

  /**
   * Opcionális kompatibilitási mezők.
   * A coach program builder a hozzárendelést a
   * /programs/{id}/assigned-users endpointból tölti.
   */
  assignedUserId?: number | null;
  userId?: number | null;
}

/**
 * Program létrehozási / módosítási kérés.
 */
export interface ProgramCreationRequest {
  programName: string;
  programDescription?: string;
  startDate?: string | null;
  durationDays?: number;
  difficultyLevel?: string;
}

/**
 * A bejelentkezett userhez rendelt program.
 */
export interface UserProgram {
  id: number;
  name: string;
  description: string;
  startDate?: string | null;
  endDate?: string | null;
  durationWeeks: number;
  difficulty: string;
  status: string;
  assignedAt: string;
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
