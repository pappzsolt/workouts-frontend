import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';

import type { ProgramDto } from '../../../models/backend-dto/programs/program-dto';
import type { UserProgramDto } from '../../../models/backend-dto/programs/user-program-dto';
import { ApiResponse } from '../../../models/backend-dto/common/api-response';

@Injectable({
  providedIn: 'root',
})
export class AssignProgramService {
  private http = inject(HttpClient);

  getAllPrograms(): Observable<ApiResponse<ProgramDto[]>> {
    return this.http.get<ApiResponse<ProgramDto[]>>(API_ENDPOINTS.allPrograms);
  }

  getMyAssignedPrograms(): Observable<ApiResponse<UserProgramDto[]>> {
    return this.http.get<ApiResponse<UserProgramDto[]>>(API_ENDPOINTS.assignedPrograms);
  }

  getAssignedUserIds(programId: number): Observable<ApiResponse<number[]>> {
    return this.http.get<ApiResponse<number[]>>(
      API_ENDPOINTS.programAssignedUsers(programId),
    );
  }

  assignProgramToUser(userId: number, programId: number): Observable<ApiResponse<void>> {
    const body = {
      userId,
      programId,
    };

    return this.http.post<ApiResponse<void>>(API_ENDPOINTS.assignProgram, body);
  }
}
