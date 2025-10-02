export interface Program {
  id?: number;

  // POST-hoz, új program létrehozás
  programName?: string;
  programDescription?: string;

  // GET-hez, lekérdezéskor
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
  programCount: number;
  programs: Program[];
}

export interface ProgramDto {
  programId: number;
  programName: string;
  programDescription: string;
  durationDays: number;
  difficultyLevel: string;
  workouts?: any[]; // opcionális, ha a frontend nem használja most
}
