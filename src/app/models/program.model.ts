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
  durationDays: number;
  difficultyLevel: string;
  workouts?: any[];
}

/**
 * Program létrehozási / módosítási kérés.
 */
export interface ProgramCreationRequest {
  programName: string;
  programDescription?: string;
  durationDays?: number;
  difficultyLevel?: string;
}
