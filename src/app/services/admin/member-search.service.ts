import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams
} from '@angular/common/http';

import {
  Observable,
  forkJoin,
  map,
  of,
  throwError
} from 'rxjs';

import { catchError, switchMap } from 'rxjs/operators';

import { API_ENDPOINTS } from '../../api-endpoints';
import {
  Coach,
  SearchResponse
} from '../../models/member-search-model';

interface CoachApiResponse {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  roles: string[];
  extraFields: any;
}

@Injectable({
  providedIn: 'root'
})
export class MemberSearchService {

  private readonly memberSearchApiUrl = API_ENDPOINTS.memberSearch;
  private readonly coachApiUrl = API_ENDPOINTS.coach;

  constructor(private http: HttpClient) {}

  searchMembers(keyword: string): Observable<SearchResponse> {

    const params = new HttpParams()
      .set('keyword', keyword.trim());

    return this.http
      .get<SearchResponse>(this.memberSearchApiUrl, { params })
      .pipe(

        switchMap(response => {

          const members = response.data;

          /*
           * A keresési eredményből kigyűjtjük
           * a coach ID-kat.
           *
           * Set miatt ugyanazt a coachot csak egyszer
           * fogjuk lekérni.
           */
          const coachIds = [
            ...new Set(
              members
                .map(member => member.extraFields?.coach_id)
                .filter((id): id is number => id != null)
            )
          ];

          /*
           * Ha egyik felhasználónak sincs coach-a,
           * nincs szükség további HTTP kérésre.
           */
          if (coachIds.length === 0) {
            return of(response);
          }

          /*
           * Coach-ok lekérése párhuzamosan.
           */
          const coachRequests: Observable<Coach | undefined>[] =
            coachIds.map(coachId =>
              this.http
                .get<CoachApiResponse>(
                  `${this.coachApiUrl}/${coachId}`
                )
                .pipe(

                  /*
                   * Backend → frontend modell átalakítás.
                   *
                   * Backend:
                   *   name
                   *
                   * Frontend:
                   *   usernameOrName
                   */
                  map(coach => ({
                    id: coach.id,
                    usernameOrName: coach.name,
                    email: coach.email,
                    avatarUrl: coach.avatarUrl,
                    roles: coach.roles,
                    extraFields: coach.extraFields
                  })),

                  /*
                   * Ha egy coach lekérése hibázik,
                   * attól még a többi találat megjelenjen.
                   */
                  catchError(() => of(undefined))
                )
            );

          return forkJoin(coachRequests).pipe(

            map(coaches => {

              /*
               * Coach ID → Coach Map
               *
               * Így nem kell minden membernél
               * coaches.find(...) keresést csinálni.
               */
              const coachMap = new Map<number, Coach>();

              coaches.forEach(coach => {

                if (coach) {
                  coachMap.set(coach.id, coach);
                }

              });

              /*
               * A member objektumokat nem módosítjuk közvetlenül,
               * hanem új objektumokat hozunk létre.
               */
              const enrichedMembers = members.map(member => {

                const coachId = member.extraFields?.coach_id;

                return {
                  ...member,
                  coach: coachId != null
                    ? coachMap.get(coachId)
                    : undefined
                };
              });

              return {
                ...response,
                data: enrichedMembers
              };
            })
          );
        }),

        catchError(error => this.handleError(error))
      );
  }

  private handleError(
    error: HttpErrorResponse
  ): Observable<never> {

    let errorMsg = 'Ismeretlen hiba történt.';

    if (error.error instanceof ErrorEvent) {

      errorMsg = `Hálózati hiba: ${error.error.message}`;

    } else if (typeof error.error === 'string') {

      errorMsg = error.error;

    } else if (error.error?.message) {

      errorMsg = error.error.message;

    } else {

      errorMsg =
        `Szerver hiba: ${error.status}, üzenet: ${error.message}`;
    }

    return throwError(() => errorMsg);
  }
}
