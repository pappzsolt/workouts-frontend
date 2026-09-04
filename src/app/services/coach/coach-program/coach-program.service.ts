import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Program,
  CoachProgramsResponse,
  ApiResponse,
  ProgramDto,
  ProgramCreationRequest,
  ProgramCreationResponse
} from '../../../models/program.model';

import { API_ENDPOINTS } from '../../../api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class CoachProgramService {

  private http = inject(HttpClient);

  getProgramsForLoggedInCoach(): Observable<CoachProgramsResponse> {
    return this.http.get<CoachProgramsResponse>(
      `${API_ENDPOINTS.programs}/coach/programs`
    );
  }

  getAllPrograms(): Observable<Program[]> {
    return this.http.get<Program[]>(
      `${API_ENDPOINTS.programs}/all`
    );
  }

  getProgramById(id: number): Observable<ApiResponse<ProgramDto>> {
    return this.http.get<ApiResponse<ProgramDto>>(
      `${API_ENDPOINTS.programs}/${id}`
    );
  }

  createProgram(
    request: ProgramCreationRequest
  ): Observable<ProgramCreationResponse> {
    return this.http.post<ProgramCreationResponse>(
      API_ENDPOINTS.createProgram,
      request
    );
  }

  updateProgram(
    id: number,
    request: ProgramCreationRequest
  ): Observable<ProgramCreationResponse> {
    return this.http.put<ProgramCreationResponse>(
      `${API_ENDPOINTS.updateProgram}?programId=${id}`,
      request
    );
  }
}
