/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
import type { ExerciseDto } from './exercise-dto';

export interface ExerciseSearchResponse {
  content: Array<ExerciseDto> | null;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
