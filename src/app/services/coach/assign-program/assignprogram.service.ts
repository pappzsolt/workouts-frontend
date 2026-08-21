import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';

import {
  ApiResponse,
  ProgramDto,
  UserProgramDto
} from '../../../models/assign-program-model';

@Injectable({
  providedIn: 'root'
})
export class AssignProgramService {

  private http = inject(HttpClient);

  getAllPrograms(): Observable<ApiResponse<ProgramDto[]>> {
    return this.http.get<ApiResponse<ProgramDto[]>>(
      API_ENDPOINTS.allPrograms
    );
  }

  getMyAssignedPrograms(): Observable<ApiResponse<UserProgramDto[]>> {
    return this.http.get<ApiResponse<UserProgramDto[]>>(
      API_ENDPOINTS.assignedPrograms
    );
  }

  assignProgramToUser(
    userId: number,
    programId: number
  ): Observable<ApiResponse<void>> {

    const body = {
      userId,
      programId
    };

    return this.http.post<ApiResponse<void>>(
      API_ENDPOINTS.assignProgram,
      body
    );
  }
}
