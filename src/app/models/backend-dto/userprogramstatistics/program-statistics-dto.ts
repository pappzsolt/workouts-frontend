/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
export interface ProgramStatisticsDto {
  programId: number | null;
  programName: string | null;
  totalWorkouts: number | null;
  completedWorkouts: number | null;
  incompleteWorkouts: number | null;
  completed: boolean | null;
  weeklyVolumes: ProgramWeeklyVolumeDto[] | null;
  exerciseStatistics: ProgramExerciseStatisticsDto[] | null;
}

export interface ProgramWeeklyVolumeDto {
  week: number;
  volumeKg: number;
  changePercent: number | null;
  weekStart: string | null;
  futureWeek: boolean;
  currentWeek: boolean;
  completedSets: number | null;
  repetitions: number | null;
  plannedSets: number | null;
  completedPlannedSets: number | null;
}

export interface ProgramExerciseStatisticsDto {
  exerciseId: number;
  exerciseName: string;
  weeks: ProgramExerciseWeeklyVolumeDto[];
  planWeeks: ProgramExercisePlanWeekDto[];
}

export interface ProgramExerciseWeeklyVolumeDto {
  week: number;
  completedSets: number;
  repetitions: number;
  volumeKg: number;
  volumeChangePercent: number | null;
  maxWeightKg: number;
  maxWeightChangeKg: number | null;
  maxWeightChangePercent: number | null;
  metrics: ProgramExerciseWeekMetricsDto | null;
}

export interface ProgramExerciseWeekMetricsDto {
  estimatedOneRepMaxKg: number | null;
  bestSingleKg: number | null;
  referenceOneRepMaxKg: number | null;
  relativeIntensityPercent: number | null;
  topSetWeightKg: number;
  topSetRepetitions: number;
  workoutCount: number;
  activeDays: number;
  targetRepetitions: number | null;
  targetVolumeKg: number | null;
  averagePrescribedRestSeconds: number | null;
  repsBelow60Percent: number | null;
  reps60To80Percent: number | null;
  repsAtLeast80Percent: number | null;
  reps60To70Percent: number | null;
  reps70To80Percent: number | null;
  reps80To90Percent: number | null;
  reps90To100Percent: number | null;
  repsAbove100Percent: number | null;
  estimatedOneRepMaxPr: boolean;
  maxWeightPr: boolean;
}

export interface ProgramExercisePlanWeekDto {
  week: number;
  futureWeek: boolean;
  plannedSets: number;
  completedSets: number;
  completionPercent: number | null;
  targetRepetitions: number | null;
  actualRepetitions: number | null;
  targetVolumeKg: number | null;
  actualVolumeKg: number | null;
}
