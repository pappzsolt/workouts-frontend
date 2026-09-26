import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { CoachDto } from '../../models/backend-dto/coach/coach-dto';

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
    return this.http.get<ApiResponse<CoachDto[]>>(this.apiUrl).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message ?? 'A coach-ok lekérése sikertelen.');
        }

        return (response.data ?? [])
          .filter((coach): coach is CoachDto & { id: number } => coach.id != null)
          .map((coach) => ({
            id: coach.id,
            name: coach.name ?? '',
          }));
      }),
    );
  }
}
