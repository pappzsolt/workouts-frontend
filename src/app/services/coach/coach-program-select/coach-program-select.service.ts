import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';

import { CoachProgram } from '../../../models/coach-program-select-model';

import { ApiResponse } from '../../../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class CoachProgramSelectService {
  private readonly http = inject(HttpClient);

  /**
   * Lekéri a bejelentkezett coach programjait.
   */
  getMyPrograms(): Observable<ApiResponse<CoachProgram[]>> {
    return this.http.get<ApiResponse<CoachProgram[]>>(API_ENDPOINTS.coachPrograms);
  }
}
