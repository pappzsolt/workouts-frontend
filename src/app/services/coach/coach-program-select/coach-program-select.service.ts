import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';

import type { GetProgramsForLoggedInCoachDto } from '../../../models/backend-dto/programs/get-programs-for-logged-in-coach-dto';
import type { CoachProgram } from '../../../models/coach-program.model';

import { ApiResponse } from '../../../models/backend-dto/common/api-response';

@Injectable({
  providedIn: 'root',
})
export class CoachProgramSelectService {
  private readonly http = inject(HttpClient);

  /**
   * Lekéri a bejelentkezett coach programjait.
   */
  getMyPrograms(): Observable<ApiResponse<CoachProgram[]>> {
    return this.http
      .get<ApiResponse<GetProgramsForLoggedInCoachDto[]>>(API_ENDPOINTS.coachPrograms)
      .pipe(
        map((response) => ({
          success: response.success,
          message: response.message,
          data: response.data
            ? response.data
                .filter(
                  (program): program is GetProgramsForLoggedInCoachDto & {
                    programId: number;
                    programName: string;
                  } => program.programId != null && program.programName != null,
                )
                .map((program) => ({
                  programId: program.programId,
                  programName: program.programName,
                  programDescription: program.programDescription ?? undefined,
                  startDate: program.startDate,
                  endDate: program.endDate,
                  durationDays: program.durationDays ?? undefined,
                  difficultyLevel: program.difficultyLevel ?? undefined,
                }))
            : null,
        })),
      );
  }
}
