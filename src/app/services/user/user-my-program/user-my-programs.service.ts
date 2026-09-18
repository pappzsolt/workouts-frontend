import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';

import { UserProgram, ProgramProgress } from '../../../models/program.model';

@Injectable({
  providedIn: 'root',
})
export class UserMyProgramsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_ENDPOINTS.assignedPrograms;

  getPrograms(): Observable<UserProgram[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((res) => {
        if (!res?.data) {
          return [];
        }

        return res.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
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
      .get<any>(`${this.apiUrl}/progress`, { params })
      .pipe(map((res) => res?.data ?? []));
  }
}
