import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  Program,
  CoachProgramsResponse,
  ApiResponse,
  ProgramDto,
  ProgramCreationRequest,
} from '../../../models/program.model';

import { API_ENDPOINTS } from '../../../api-endpoints';

@Injectable({
  providedIn: 'root',
})
export class CoachProgramService {
  private http = inject(HttpClient);

  /**
   * Bejelentkezett coach programjai.
   */
  getProgramsForLoggedInCoach(): Observable<CoachProgramsResponse> {
    return this.http.get<CoachProgramsResponse>(`${API_ENDPOINTS.programs}/coach/programs`);
  }

  /**
   * Összes program.
   */
  getAllPrograms(): Observable<ApiResponse<Program[]>> {
    return this.http.get<ApiResponse<Program[]>>(`${API_ENDPOINTS.programs}/all`);
  }

  /**
   * Program lekérése ID alapján.
   */
  getProgramById(id: number): Observable<ApiResponse<ProgramDto>> {
    return this.http.get<ApiResponse<ProgramDto>>(`${API_ENDPOINTS.programs}/${id}`);
  }

  /**
   * Új program létrehozása.
   *
   * Backend data = programId
   */
  createProgram(request: ProgramCreationRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(API_ENDPOINTS.createProgram, request);
  }

  /**
   * Program módosítása.
   *
   * Backend data = programId
   */
  updateProgram(id: number, request: ProgramCreationRequest): Observable<ApiResponse<number>> {
    return this.http.put<ApiResponse<number>>(
      `${API_ENDPOINTS.updateProgram}?programId=${id}`,
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
    language: string = 'hu',
    sortDirection: 'asc' | 'desc' = 'asc',
  ): Observable<any> {
    const params = new HttpParams()
      .set('search', search)
      .set('page', page)
      .set('size', size)
      .set('language', language)
      .set('sortDirection', sortDirection);

    return this.http.get<any>(`${API_ENDPOINTS.programs}/coach/search`, { params });
  }
}
