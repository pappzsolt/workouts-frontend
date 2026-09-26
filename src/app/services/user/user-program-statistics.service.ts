import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import { ProgramStatistics } from '../../models/user-program-statistics.model';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { ProgramStatisticsResponse } from '../../models/backend-dto/userprogramstatistics/program-statistics-response';

@Injectable({
  providedIn: 'root',
})
export class UserProgramStatisticsService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = API_ENDPOINTS.userProgramStatistics;

  /**
   * A bejelentkezett user programjainak összesített statisztikái.
   *
   * A user ID-t nem küldjük a backendnek.
   * A backend a bejelentkezett user alapján
   * határozza meg, hogy milyen adatok adhatók vissza.
   */
  getProgramStatistics(language: string): Observable<ApiResponse<ProgramStatistics>> {
    return this.http.get<ApiResponse<ProgramStatisticsResponse>>(this.apiUrl, {
      params: { language },
    }).pipe(
      map((response) => ({
        success: response.success,
        message: response.message,
        data: response.data
          ? {
              totalPrograms: response.data.totalPrograms ?? 0,
              completedPrograms: response.data.completedPrograms ?? 0,
              programs: (response.data.programs ?? [])
                .filter((program) => program.programId != null)
                .map((program) => ({
                  programId: program.programId as number,
                  programName: program.programName ?? '',
                  totalWorkouts: program.totalWorkouts ?? 0,
                  completedWorkouts: program.completedWorkouts ?? 0,
                  incompleteWorkouts: program.incompleteWorkouts ?? 0,
                  completed: program.completed ?? false,
                })),
            }
          : null,
      })),
    );
  }
}
