import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';

import { API_ENDPOINTS } from '../../../api-endpoints';
import type { ApiResponse } from '../../../models/backend-dto/common/api-response';
import type { GetProgramsForLoggedInCoachDto } from '../../../models/backend-dto/programs/get-programs-for-logged-in-coach-dto';
import type { ProgramDto as BackendProgramDto } from '../../../models/backend-dto/programs/program-dto';
import type { ProgramCreationRequest as BackendProgramCreationRequest } from '../../../models/backend-dto/programcreator/program-creation-request';

import type { CoachProgram } from '../../../models/coach-program.model';
import type { PageResponse } from '../../../models/backend-dto/common/page-response';
import { LanguageService } from '../../shared/language.service';

@Injectable({
  providedIn: 'root',
})
export class CoachProgramService {
  private readonly http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);

  /**
   * Összes program.
   */
  getAllPrograms(): Observable<ApiResponse<BackendProgramDto[]>> {
    const params = new HttpParams().set(
      'language',
      this.languageService.getCurrentLanguage(),
    );

    return this.http.get<ApiResponse<BackendProgramDto[]>>(
      API_ENDPOINTS.allPrograms,
      { params },
    );
  }

  /**
   * Program lekérése ID alapján.
   *
   * Az endpoint backend DTO szerződését közvetlenül adja vissza.
   */
  getProgramById(id: number): Observable<ApiResponse<BackendProgramDto>> {
    const params = new HttpParams().set(
      'language',
      this.languageService.getCurrentLanguage(),
    );

    return this.http.get<ApiResponse<BackendProgramDto>>(
      API_ENDPOINTS.programById(id),
      { params },
    );
  }


  /**
   * A bejelentkezett coach saját programjának törlése.
   *
   * A jogosultságot a backend ellenőrzi; a frontend a coach
   * programlistájában csak a saját programokra kínálja fel a műveletet.
   */
  deleteCoachProgram(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      API_ENDPOINTS.coachProgramDelete(id),
    );
  }

  /**
   * Új program létrehozása.
   *
   * A meglévő UI requestet explicit backend request DTO-vá alakítjuk.
   */
  createProgram(
    request: BackendProgramCreationRequest,
  ): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(
      API_ENDPOINTS.createProgram,
      request,
    );
  }

  /**
   * Program módosítása.
   */
  updateProgram(
    id: number,
    request: BackendProgramCreationRequest,
  ): Observable<ApiResponse<number>> {
    return this.http.put<ApiResponse<number>>(
      API_ENDPOINTS.updateUserProgram(id),
      request,
    );
  }

  /**
   * Bejelentkezett coach programjainak keresése és lapozása.
   */
  searchProgramsForCoach(
    search: string,
    page: number = 0,
    size: number = 6,
    language?: string,
    sortDirection: 'asc' | 'desc' = 'asc',
  ): Observable<PageResponse<CoachProgram>> {
    const params = new HttpParams()
      .set('search', search)
      .set('page', page)
      .set('size', size)
      .set('language', language ?? this.languageService.getCurrentLanguage())
      .set('sortDirection', sortDirection);

    return this.http
      .get<PageResponse<GetProgramsForLoggedInCoachDto>>(API_ENDPOINTS.coachProgramSearch, { params })
      .pipe(
        map((response) => ({
          content: (response.content ?? [])
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
              startDate: program.startDate ?? undefined,
              endDate: program.endDate ?? undefined,
              durationDays: program.durationDays ?? undefined,
              difficultyLevel: program.difficultyLevel ?? undefined,
              workoutCount: program.workoutCount,
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