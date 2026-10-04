/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
import type { ProgramStatisticsDto } from './program-statistics-dto';

export interface ProgramStatisticsResponse {
  totalPrograms: number | null;
  completedPrograms: number | null;
  programs: Array<ProgramStatisticsDto> | null;
}
