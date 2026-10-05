export interface ProgramStatistics {
  totalPrograms: number;
  completedPrograms: number;
  programs: ProgramStatisticsProgram[];
}

export interface ProgramStatisticsProgram {
  programId: number;
  programName: string;
  totalWorkouts: number;
  completedWorkouts: number;
  incompleteWorkouts: number;
  completed: boolean;
}
