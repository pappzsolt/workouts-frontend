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

export interface CoachProgramsResponse {
  status: string;
  data: Program[];
  message?: string | null;
  count: number;
}

export interface ProgramDto {
  programId: number;
  programName: string;
  programDescription: string;
  durationDays: number;
  difficultyLevel: string;
  workouts?: any[];
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string | null;
  count: number;
}

/**
 * Backend:
 *
 * private String programName;
 * private String programDescription;
 * private Integer durationDays;
 * private String difficultyLevel;
 */
export interface ProgramCreationRequest {
  programName: string;
  programDescription?: string;
  durationDays?: number;
  difficultyLevel?: string;
}

/**
 * Backend ProgramCreationResponse
 */
export interface ProgramCreationResponse {
  success: boolean;
  message: string;
  programId: number | null;
}
