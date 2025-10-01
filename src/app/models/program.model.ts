export interface Program {
  id?: number;
  programName: string;             // backend kötelező mező
  programDescription?: string;     // backend opcionális
  coachId?: number;                // opcionális, backendben coachId
  startDate?: string;              // ISO string, vagy Date ha szeretnéd
  endDate?: string;                // ISO string, vagy Date
  durationDays?: number;           // backend opcionális
  difficultyLevel?: string;        // backend opcionális
  workouts?: ProgramWorkout[];     // opcionális, a DTO Workout listájához
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
