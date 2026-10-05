import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';

import type { ProgramDto } from '../../../models/backend-dto/programs/program-dto';
import type { UserProgramDto } from '../../../models/backend-dto/programs/user-program-dto';
import { ApiResponse } from '../../../models/backend-dto/common/api-response';
import { LanguageService } from '../../shared/language.service';

@Injectable({
  providedIn: 'root',
})
export class AssignProgramService {
  private http = inject(HttpClient);
  private languageService = inject(LanguageService);

  getAllPrograms(): Observable<ApiResponse<ProgramDto[]>> {
    const params = new HttpParams().set(
      'language',
      this.languageService.getCurrentLanguage(),
    );

    return this.http.get<ApiResponse<ProgramDto[]>>(
      API_ENDPOINTS.allPrograms,
      { params },
    );
  }

  getMyAssignedPrograms(): Observable<ApiResponse<UserProgramDto[]>> {
    const params = new HttpParams().set(
      'language',
      this.languageService.getCurrentLanguage(),
    );

    return this.http.get<ApiResponse<UserProgramDto[]>>(
      API_ENDPOINTS.assignedPrograms,
      { params },
    );
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
