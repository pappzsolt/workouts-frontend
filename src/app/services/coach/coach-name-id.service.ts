import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import { ApiResponse } from '../../models/api-response.model';

export interface CoachNameId {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class CoachNameIdService {
  private readonly apiUrl = API_ENDPOINTS.coachesNameId;

  constructor(private http: HttpClient) {}

  /**
   * Lekéri az összes coach-t az API-ból.
   *
   * Backend válasz:
   *
   * ApiResponse<CoachNameId[]>
   *
   * A komponensek felé:
   *
   * CoachNameId[]
   */
  getAllCoaches(): Observable<CoachNameId[]> {
    return this.http.get<ApiResponse<CoachNameId[]>>(this.apiUrl).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message ?? 'A coach-ok lekérése sikertelen.');
        }

        return response.data;
      }),
    );
  }
}
