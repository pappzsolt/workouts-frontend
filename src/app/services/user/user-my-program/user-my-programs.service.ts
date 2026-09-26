import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';

import { ApiResponse } from '../../../models/api-response.model';
import { UserProgram, UserProgramApiItem, ProgramProgress } from '../../../models/program.model';

@Injectable({
  providedIn: 'root',
})
export class UserMyProgramsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_ENDPOINTS.assignedPrograms;

  getPrograms(): Observable<UserProgram[]> {
    return this.http.get<ApiResponse<UserProgramApiItem[]>>(this.apiUrl).pipe(
      map((res) => {
        if (!res?.data) {
          return [];
        }

        return res.data.map((p: UserProgramApiItem) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          startDate: p.startDate ?? null,
          endDate: p.endDate ?? null,
          durationWeeks: Math.ceil(p.durationDays / 7),
          difficulty: p.difficulty,
          status: p.status,
          assignedAt: p.assignedAt,
        }));
      }),

      catchError(() => of([])),
    );
  }

  getProgramProgress(programIds: number[]): Observable<ProgramProgress[]> {
    const params = programIds.reduce(
      (httpParams, programId) => httpParams.append('programIds', programId.toString()),
      new HttpParams(),
    );

    return this.http
      .get<ApiResponse<ProgramProgress[]>>(API_ENDPOINTS.assignedProgramsProgress, { params })
      .pipe(map((res) => res?.data ?? []));
  }
}
