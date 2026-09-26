import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';

import { API_ENDPOINTS } from '../../../api-endpoints';
import type { ApiResponse } from '../../../models/backend-dto/common/api-response';
import type { GetProgramsForLoggedInCoachDto } from '../../../models/backend-dto/programs/get-programs-for-logged-in-coach-dto';
import type { ProgramDto as BackendProgramDto } from '../../../models/backend-dto/programs/program-dto';
import type { ProgramSearchResponse } from '../../../models/backend-dto/programs/program-search-response';
import type { ProgramCreationRequest as BackendProgramCreationRequest } from '../../../models/backend-dto/programcreator/program-creation-request';

import type {
  ProgramCreationRequest,
  CoachProgramSearchResponse,
} from '../../../models/program.model';
import type { CoachProgram } from '../../../models/coach-program.model';

@Injectable({
  providedIn: 'root',
})
export class CoachProgramService {
  private readonly http = inject(HttpClient);

  /**
   * Bejelentkezett coach programjai.
   *
   * Az API-határon a backend DTO-t használjuk, majd explicit UI modellé alakítjuk.
   */
  getProgramsForLoggedInCoach(): Observable<ApiResponse<CoachProgram[]>> {
    return this.http
      .get<ApiResponse<GetProgramsForLoggedInCoachDto[]>>(
        API_ENDPOINTS.coachProgramsList,
      )
      .pipe(
        map((response) => ({
          success: response.success,
          message: response.message,
          data: response.data
            ? response.data
                .filter(
                  (
                    program,
                  ): program is GetProgramsForLoggedInCoachDto & {
                    programId: number;
                    programName: string;
                  } =>
                    program.programId != null &&
                    program.programName != null,
                )
                .map((program) => ({
                  programId: program.programId,
                  programName: program.programName,
                  programDescription: program.programDescription ?? undefined,
                  startDate: program.startDate,
                  endDate: program.endDate,
                  durationDays: program.durationDays ?? undefined,
                  difficultyLevel: program.difficultyLevel ?? undefined,
                  workouts: [],
                }))
            : null,
        })),
      );
  }

  /**
   * Összes program.
   */
  getAllPrograms(): Observable<ApiResponse<BackendProgramDto[]>> {
    return this.http.get<ApiResponse<BackendProgramDto[]>>(
      API_ENDPOINTS.allProgramsList,
    );
  }

  /**
   * Program lekérése ID alapján.
   *
   * Az endpoint backend DTO szerződését közvetlenül adja vissza.
   */
  getProgramById(id: number): Observable<ApiResponse<BackendProgramDto>> {
    return this.http.get<ApiResponse<BackendProgramDto>>(
      API_ENDPOINTS.programById(id),
    );
  }

  /**
   * Új program létrehozása.
   *
   * A meglévő UI requestet explicit backend request DTO-vá alakítjuk.
   */
  createProgram(
    request: ProgramCreationRequest,
  ): Observable<ApiResponse<number>> {
    const backendRequest: BackendProgramCreationRequest = {
      userId: null,
      programName: request.programName ?? null,
      programDescription: request.programDescription ?? null,
      durationDays: request.durationDays ?? null,
      startDate: request.startDate ?? null,
      difficultyLevel: request.difficultyLevel ?? null,
      languageCode: null,
      workouts: null,
      workoutId: null,
      exercises: null,
      exerciseId: null,
      orderIndex: null,
    };

    return this.http.post<ApiResponse<number>>(
      API_ENDPOINTS.createProgram,
      backendRequest,
    );
  }

  /**
   * Program módosítása.
   */
  updateProgram(
    id: number,
    request: ProgramCreationRequest,
  ): Observable<ApiResponse<number>> {
    const backendRequest: BackendProgramCreationRequest = {
      userId: null,
      programName: request.programName ?? null,
      programDescription: request.programDescription ?? null,
      durationDays: request.durationDays ?? null,
      startDate: request.startDate ?? null,
      difficultyLevel: request.difficultyLevel ?? null,
      languageCode: null,
      workouts: null,
      workoutId: null,
      exercises: null,
      exerciseId: null,
      orderIndex: null,
    };

    return this.http.put<ApiResponse<number>>(
      API_ENDPOINTS.updateUserProgram(id),
      backendRequest,
    );
  }

  /**
   * Bejelentkezett coach programjainak keresése és lapozása.
   */
  searchProgramsForCoach(
    search: string,
    page: number = 0,
    size: number = 6,
    language: string = 'hu',
    sortDirection: 'asc' | 'desc' = 'asc',
  ): Observable<CoachProgramSearchResponse> {
    const params = new HttpParams()
      .set('search', search)
      .set('page', page)
      .set('size', size)
      .set('language', language)
      .set('sortDirection', sortDirection);

    return this.http
      .get<ProgramSearchResponse>(API_ENDPOINTS.coachProgramSearch, { params })
      .pipe(
        map((response) => ({
          content: (response.content ?? [])
            .filter(
              (
                program,
              ): program is BackendProgramDto & {
                programId: number;
                programName: string;
              } =>
                program.programId != null &&
                program.programName != null,
            )
            .map((program) => ({
              programId: program.programId,
              programName: program.programName,
              programDescription: program.programDescription ?? undefined,
              startDate: program.startDate ?? undefined,
              endDate: program.endDate ?? undefined,
              durationDays: program.durationDays ?? undefined,
              difficultyLevel: program.difficultyLevel ?? undefined,
              workouts: [],
            })),
          page: response.page,
          size: response.size,
          totalElements: response.totalElements,
          totalPages: response.totalPages,
        })),
      );
  }
}
