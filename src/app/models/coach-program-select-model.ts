export interface CoachProgram {
  programId: number;
  programName: string;
  programDescription?: string;
  startDate?: string | null;
  endDate?: string | null;
  durationDays?: number;
  difficultyLevel?: string;
}
