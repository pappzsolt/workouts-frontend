import type {
  ProgramExercisePlanWeekDto,
  ProgramExerciseStatisticsDto,
  ProgramExerciseWeekMetricsDto,
  ProgramExerciseWeeklyVolumeDto,
  ProgramStatisticsStatus,
  ProgramWeeklyVolumeDto,
} from './backend-dto/userprogramstatistics/program-statistics-dto';

/**
 * A program statisztikák a felületen. A heti és gyakorlatonkénti adatok szerkezete azonos a
 * backend DTO-éval; csak a program szintje tér el: ott a hiányzó értékek már alapértéket kaptak
 * (lásd UserProgramStatisticsService).
 */
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
  startDate: string | null;
  endDate: string | null;
  /** COMPLETED | FINISHED (lejárt, nem minden teljesült) | UPCOMING | ACTIVE; régebbi backendnél null. */
  status: ProgramStatisticsStatus | null;
}

export type ProgramWeeklyVolume = ProgramWeeklyVolumeDto;
export type ProgramExerciseStatistics = ProgramExerciseStatisticsDto;
export type ProgramExerciseWeek = ProgramExerciseWeeklyVolumeDto;
export type ProgramExerciseWeekMetrics = ProgramExerciseWeekMetricsDto;
export type ProgramExercisePlanWeek = ProgramExercisePlanWeekDto;
