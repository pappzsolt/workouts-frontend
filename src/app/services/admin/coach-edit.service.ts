import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';

import { Coach } from '../../models/coach.model';

import {
  CoachResponse,
  CoachesResponse,
  SingleCoachResponse,
} from '../../models/coach-response.model';

import { ApiResponse } from '../../models/backend-dto/common/api-response';

import { UpdateCoachRequest } from '../../models/update-coach-request.model';

@Injectable({
  providedIn: 'root',
})
export class CoachEditService {
  private readonly coachesUrl = API_ENDPOINTS.allCoaches;

  private readonly membersUrl = API_ENDPOINTS.members;

  constructor(private readonly http: HttpClient) {}

  /**
   * Összes edző lekérése.
   */
  getCoaches(): Observable<Coach[]> {
    return this.http.get<CoachesResponse>(this.coachesUrl).pipe(
      map((response) => {
        if (response.data == null) {
          throw new Error('Az edzők válaszában nincs adat.');
        }
        return response.data.map((item) => this.mapCoach(item));
      }),

      catchError(() => throwError(() => new Error('Az edzők listájának betöltése nem sikerült.'))),
    );
  }

  /**
   * Egy edző lekérése ID alapján.
   */
  getCoach(id: number): Observable<Coach> {
    return this.http.get<SingleCoachResponse>(API_ENDPOINTS.memberById(id)).pipe(
      map((response) => {
        if (response.data == null) {
          throw new Error('Az edző válaszában nincs adat.');
        }
        return this.mapCoach(response.data);
      }),

      catchError(() => throwError(() => new Error('Az edző adatainak betöltése nem sikerült.'))),
    );
  }

  /**
   * Edző adatainak frissítése.
   */
  updateCoach(id: number, coach: Coach): Observable<Coach> {
    const payload: UpdateCoachRequest = {
      id,
      type: 'coach',
      name: coach.name,
      email: coach.email,
      avatarUrl: coach.avatarUrl,
      phone: coach.phone,
      specialization: coach.specialization,
      roleIds: [3],
    };

    if (coach.password && coach.password.trim() !== '') {
      payload.passwordHash = coach.password;
    }

    return this.http.post<ApiResponse<void>>(this.membersUrl, payload).pipe(
      map(() => ({
        ...coach,
        id,
      })),

      catchError(() => throwError(() => new Error('Az edző adatainak mentése nem sikerült.'))),
    );
  }

  /**
   * Backend CoachResponse → frontend Coach modell.
   */
  private mapCoach(item: CoachResponse): Coach {
    return {
      id: item.id,
      name: item.usernameOrName,
      email: item.email,
      phone: item.extraFields?.phone ?? '',
      specialization: item.extraFields?.specialization ?? '',
      avatarUrl: item.avatarUrl ?? '',
      password: '',
    };
  }
}
