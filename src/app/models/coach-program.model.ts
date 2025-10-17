export interface CoachProgram {
  programId: number;
  programName: string;
  programDescription?: string;
  durationDays?: number;
  difficultyLevel?: string;
  workouts: any[]; // kötelező a board komponens számára
}
