import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import { ProgramStatistics } from '../../models/user-program-statistics.model';
import { ApiResponse } from '../../models/api-response.model';

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
    return this.http.get<ApiResponse<ProgramStatistics>>(this.apiUrl, {
      params: { language },
    });
  }
}
