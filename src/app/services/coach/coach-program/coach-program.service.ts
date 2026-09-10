import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
}
