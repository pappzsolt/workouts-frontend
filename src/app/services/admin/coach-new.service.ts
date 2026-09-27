import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { Observable, catchError, throwError } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';

import { CreateCoachRequest } from '../../models/create-coach-request.model';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';

@Injectable({
  providedIn: 'root',
})
export class CoachNewService {
  private readonly apiUrl = API_ENDPOINTS.members;

  constructor(private readonly http: HttpClient) {}

  /**
   * Új edző létrehozása.
   */
  createCoach(coachData: CreateCoachRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(this.apiUrl, coachData).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      }),
    );
  }
}
