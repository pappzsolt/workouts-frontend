/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
import type { ProgramWorkoutDto } from './program-workout-dto';

export interface ProgramDto {
  programId: number | null;
  programName: string | null;
  programDescription: string | null;
  durationDays: number | null;
  difficultyLevel: string | null;
  startDate: string | null;
  endDate: string | null;
  workouts: Array<ProgramWorkoutDto> | null;
}
