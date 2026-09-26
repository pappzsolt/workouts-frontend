import { ProgramWorkout } from './program.model';

export interface CoachProgram {
  programId: number;
  programName: string;
  programDescription?: string;
  startDate?: string | null;
  endDate?: string | null;
  durationDays?: number;
  difficultyLevel?: string;
  workouts: ProgramWorkout[]; // kötelező a board komponens számára
}
