/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
import type { GetProgramsForLoggedInCoachDto } from './get-programs-for-logged-in-coach-dto';

export interface ProgramSearchResponse {
  content: Array<GetProgramsForLoggedInCoachDto> | null;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
