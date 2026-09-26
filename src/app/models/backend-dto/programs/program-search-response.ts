/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
import type { ProgramDto } from './program-dto';

export interface ProgramSearchResponse {
  content: Array<ProgramDto> | null;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
