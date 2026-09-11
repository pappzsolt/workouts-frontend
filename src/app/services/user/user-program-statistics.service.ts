import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import { ProgramStatisticsRow } from '../../models/user-program-statistics.model';
import { ApiResponse } from '../../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class UserProgramStatisticsService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = API_ENDPOINTS.userProgramStatistics;

  /**
   * A bejelentkezett user kiválasztott programjának
   * statisztikai adatai.
   *
   * A user ID-t nem küldjük a backendnek.
   * A backend a bejelentkezett user alapján
   * határozza meg, hogy milyen adatok adhatók vissza.
   */
  getProgramStatistics(programId: number): Observable<ApiResponse<ProgramStatisticsRow[]>> {
    return this.http.get<ApiResponse<ProgramStatisticsRow[]>>(`${this.apiUrl}/${programId}`);
  }
}
