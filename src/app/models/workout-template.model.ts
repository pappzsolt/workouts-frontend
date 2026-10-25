import type { PersonalProgramRequest } from './personal-program.model';

export interface WorkoutTemplate {
  id: number;
  sourceProgramId: number | null;
  favorite: boolean;
  createdAt: string;
  program: PersonalProgramRequest;
}
