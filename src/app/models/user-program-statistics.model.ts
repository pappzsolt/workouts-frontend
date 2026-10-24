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
  weeklyVolumes: ProgramWeeklyVolume[];
  exerciseStatistics: ProgramExerciseStatistics[];
}

export interface ProgramWeeklyVolume {
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

export interface ProgramExerciseStatistics {
  exerciseId: number;
  exerciseName: string;
  weeks: ProgramExerciseWeek[];
  planWeeks: ProgramExercisePlanWeek[];
}

export interface ProgramExerciseWeek {
  week: number;
  completedSets: number;
  repetitions: number;
  volumeKg: number;
  volumeChangePercent: number | null;
  maxWeightKg: number;
  maxWeightChangeKg: number | null;
  maxWeightChangePercent: number | null;
  metrics: ProgramExerciseWeekMetrics | null;
}

export interface ProgramExerciseWeekMetrics {
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

export interface ProgramExercisePlanWeek {
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
