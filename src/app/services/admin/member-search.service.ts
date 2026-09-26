import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';

import { Observable, forkJoin, map, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { API_ENDPOINTS } from '../../api-endpoints';

import { Coach, SearchResponse } from '../../models/member-search-model';
import type { ExtraFields } from '../../models/extra-fields.model';

import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { CoachLookupDto } from '../../models/backend-dto/coach/coach-lookup-dto';
import type { MemberResponse } from '../../models/backend-dto/members/member-response';

@Injectable({
  providedIn: 'root',
})
export class MemberSearchService {
  private readonly memberSearchApiUrl = API_ENDPOINTS.memberSearch;

  constructor(private readonly http: HttpClient) {}

  /**
   * Member keresés.
   *
   * A keresési eredményben szereplő coach ID-k alapján
   * lekérjük a coach adatokat is.
   */
  searchMembers(keyword: string): Observable<SearchResponse> {
    const params = new HttpParams().set('keyword', keyword.trim());

    return this.http
      .get<ApiResponse<MemberResponse[]>>(this.memberSearchApiUrl, { params })
      .pipe(
        map((response) => ({
          success: response.success,
          message: response.message ?? '',
          data: (response.data ?? [])
            .filter(this.hasRequiredMemberFields)
            .map((member) => ({
              id: member.id,
              type: member.type,
              usernameOrName: member.usernameOrName,
              email: member.email,
              avatarUrl: member.avatarUrl,
              roles: member.roles ?? [],
              extraFields: this.mapExtraFields(member.extraFields),
            })),
        })),
        switchMap((response) => {
          const coachIds = [
            ...new Set(
              response.data
                .map((member) => member.extraFields.coach_id)
                .filter((id): id is number => id != null),
            ),
          ];

          if (coachIds.length === 0) {
            return of(response);
          }

          const coachRequests: Observable<Coach | undefined>[] = coachIds.map((coachId) =>
            this.http
              .get<ApiResponse<CoachLookupDto>>(API_ENDPOINTS.coachById(coachId))
              .pipe(
                map((response) => this.mapCoach(response.data)),
                catchError(() => of(undefined)),
              ),
          );

          return forkJoin(coachRequests).pipe(
            map((coaches) => {
              const coachMap = new Map<number, Coach>();

              coaches.forEach((coach) => {
                if (coach) {
                  coachMap.set(coach.id, coach);
                }
              });

              return {
                ...response,
                data: response.data.map((member) => {
                  const coachId = member.extraFields.coach_id;

                  return {
                    ...member,
                    coach: coachId != null ? coachMap.get(coachId) : undefined,
                  };
                }),
              };
            }),
          );
        }),
        catchError((error: HttpErrorResponse) => this.handleError(error)),
      );
  }

  private mapCoach(coach: CoachLookupDto | null): Coach | undefined {
    if (coach?.id == null || coach.name == null || coach.email == null) {
      return undefined;
    }

    return {
      id: coach.id,
      usernameOrName: coach.name,
      email: coach.email,
      avatarUrl: coach.avatarUrl,
    };
  }

  private mapExtraFields(
    extraFields: Record<string, unknown> | null,
  ): ExtraFields {
    if (extraFields == null) {
      return {};
    }

    return {
      ...this.numberExtraField('coach_id', extraFields['coach_id']),
      ...this.stringExtraField('gender', extraFields['gender']),
      ...this.numberExtraField('weight', extraFields['weight']),
      ...this.numberExtraField('age', extraFields['age']),
      ...this.numberExtraField('height', extraFields['height']),
      ...this.stringExtraField('goals', extraFields['goals']),
    };
  }

  private numberExtraField(
    key: 'coach_id' | 'weight' | 'age' | 'height',
    value: unknown,
  ): Partial<Pick<ExtraFields, 'coach_id' | 'weight' | 'age' | 'height'>> {
    if (typeof value !== 'number') {
      return {};
    }

    return { [key]: value };
  }

  private stringExtraField(
    key: 'gender' | 'goals',
    value: unknown,
  ): Partial<Pick<ExtraFields, 'gender' | 'goals'>> {
    if (typeof value !== 'string') {
      return {};
    }

    return { [key]: value };
  }

  private hasRequiredMemberFields(
    member: MemberResponse,
  ): member is MemberResponse & {
    id: number;
    type: 'user' | 'coach';
    usernameOrName: string;
    email: string;
  } {
    return (
      member.id != null &&
      (member.type === 'user' || member.type === 'coach') &&
      member.usernameOrName != null &&
      member.email != null
    );
  }

  /**
   * HTTP hibák egységes kezelése.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMsg = 'Ismeretlen hiba történt.';

    if (error.error instanceof ErrorEvent) {
      errorMsg = `Hálózati hiba: ${error.error.message}`;
    } else if (typeof error.error === 'string') {
      errorMsg = error.error;
    } else if (error.error?.message) {
      errorMsg = error.error.message;
    } else {
      errorMsg = `Szerver hiba: ${error.status}, üzenet: ${error.message}`;
    }

    return throwError(() => errorMsg);
  }
}
