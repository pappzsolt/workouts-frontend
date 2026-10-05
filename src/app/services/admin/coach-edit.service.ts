import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';

import { Coach } from '../../models/coach.model';

import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { MemberRequest } from '../../models/backend-dto/members/member-request';
import type { MemberResponse } from '../../models/backend-dto/members/member-response';

@Injectable({
  providedIn: 'root',
})
export class CoachEditService {
  private readonly membersUrl = API_ENDPOINTS.members;

  constructor(private readonly http: HttpClient) {}

  /**
   * Összes edző lekérése.
   *
   * Backend DTO: MemberResponse
   * UI modell: Coach
   */
  getCoaches(): Observable<Coach[]> {
    return this.http.get<ApiResponse<MemberResponse[]>>(this.membersUrl).pipe(
      map((response) => {
        if (response.data == null) {
          throw new Error('Az edzők válaszában nincs adat.');
        }

        return response.data
          .filter((item) => item.type === 'coach')
          .filter(this.isCompleteCoachResponse)
          .map((item) => this.mapCoach(item));
      }),
      catchError(() =>
        throwError(() => new Error('Az edzők listájának betöltése nem sikerült.')),
      ),
    );
  }

  /**
   * Egy edző lekérése ID alapján.
   *
   * Backend DTO: MemberResponse
   * UI modell: Coach
   */
  getCoach(id: number): Observable<Coach> {
    return this.http
      .get<ApiResponse<MemberResponse>>(API_ENDPOINTS.memberCoachById(id))
      .pipe(
        map((response) => {
          if (response.data == null || !this.isCompleteCoachResponse(response.data)) {
            throw new Error('Az edző válaszában nincs érvényes adat.');
          }

          return this.mapCoach(response.data);
        }),
        catchError(() =>
          throwError(() => new Error('Az edző adatainak betöltése nem sikerült.')),
        ),
      );
  }

  /**
   * Edző adatainak frissítése.
   *
   * Backend request DTO: MemberRequest
   * UI modell: Coach
   */
  updateCoach(id: number, coach: Coach): Observable<Coach> {
    const payload: MemberRequest = {
      id,
      type: 'coach',
      username: null,
      name: coach.name,
      email: coach.email,
      passwordHash:
        coach.password && coach.password.trim() !== '' ? coach.password : null,
      age: null,
      weight: null,
      height: null,
      gender: null,
      goals: null,
      avatarUrl: coach.avatarUrl ?? null,
      coachId: null,
      phone: coach.phone,
      specialization: coach.specialization ?? null,
      roleIds: [3],
    };

    return this.http.post<ApiResponse<void>>(this.membersUrl, payload).pipe(
      map(() => ({
        ...coach,
        id,
      })),
      catchError(() =>
        throwError(() => new Error('Az edző adatainak mentése nem sikerült.')),
      ),
    );
  }

  /**
   * Backend MemberResponse → frontend Coach modell.
   */
  private mapCoach(item: MemberResponse): Coach {
    const extraFields = item.extraFields;

    return {
      id: item.id!,
      name: item.usernameOrName!,
      email: item.email!,
      phone: this.getStringExtraField(extraFields, 'phone'),
      specialization: this.getStringExtraField(extraFields, 'specialization'),
      avatarUrl: item.avatarUrl ?? '',
      password: '',
    };
  }

  private isCompleteCoachResponse(
    item: MemberResponse,
  ): item is MemberResponse & {
    id: number;
    usernameOrName: string;
    email: string;
  } {
    return (
      item.id != null &&
      item.usernameOrName != null &&
      item.email != null
    );
  }

  private getStringExtraField(
    extraFields: Record<string, unknown> | null,
    key: string,
  ): string {
    const value = extraFields?.[key];
    return typeof value === 'string' ? value : '';
  }
}
