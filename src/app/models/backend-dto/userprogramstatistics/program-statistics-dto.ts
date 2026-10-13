/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
export interface ProgramStatisticsDto {
  programId: number | null;
  programName: string | null;
  totalWorkouts: number | null;
  completedWorkouts: number | null;
  incompleteWorkouts: number | null;
  completed: boolean | null;
  weeklyVolumes: ProgramWeeklyVolumeDto[] | null;
}

export interface ProgramWeeklyVolumeDto {
  week: number;
  volumeKg: number;
  changePercent: number | null;
}
