import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';

import { ApiResponse } from '../../../models/backend-dto/common/api-response';
import type { UserProgramDto } from '../../../models/backend-dto/programs/user-program-dto';
import type { ProgramProgressDto } from '../../../models/backend-dto/programs/program-progress-dto';
import { UserProgram, ProgramProgress } from '../../../models/program.model';

@Injectable({
  providedIn: 'root',
})
export class UserMyProgramsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_ENDPOINTS.assignedPrograms;

  getPrograms(): Observable<UserProgram[]> {
    return this.http.get<ApiResponse<UserProgramDto[]>>(this.apiUrl).pipe(
      map((res) => {
        if (!res?.data) {
          return [];
        }

        return (res.data ?? []).filter((p): p is UserProgramDto & { id: number } => p.id != null).map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          startDate: p.startDate ?? null,
          endDate: p.endDate ?? null,
          durationWeeks: Math.ceil((p.durationDays ?? 0) / 7),
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
      .get<ApiResponse<ProgramProgressDto[]>>(API_ENDPOINTS.assignedProgramsProgress, { params })
      .pipe(
        map((res) => (res.data ?? []).filter((p): p is ProgramProgressDto & { programId: number } => p.programId != null).map((p) => ({
          programId: p.programId,
          completedWorkouts: p.completedWorkouts ?? 0,
          totalWorkouts: p.totalWorkouts ?? 0,
          progressPercent: p.progressPercent ?? 0,
        }))),
      );
  }
}
