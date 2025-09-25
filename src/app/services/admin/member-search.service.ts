import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, forkJoin, map } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { API_ENDPOINTS } from '../../api-endpoints';
import { Coach,SearchResponse } from '../../models/member-search-model';



@Injectable({
  providedIn: 'root'
})
export class MemberSearchService {
  private memberSearchApiUrl = API_ENDPOINTS.memberSearch;
  private coachApiUrl = API_ENDPOINTS.coach

  constructor(private http: HttpClient) {}

  searchMembers(keyword: string): Observable<SearchResponse> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<SearchResponse>(this.memberSearchApiUrl, { params }).pipe(
      switchMap(response => {
        const members = response.data;

        const coachIds = members
          .filter(m => m.extraFields?.coach_id)
          .map(m => m.extraFields.coach_id);

        if (coachIds.length === 0) {
          return new Observable<SearchResponse>(observer => {
            observer.next(response);
            observer.complete();
          });
        }

        const coachRequests = coachIds.map(id =>
          this.http.get<Coach>(`${this.coachApiUrl}/${id}`).pipe(
            map(coach => {
              if (coach) {
                // Átnevezzük a backend name mezőt usernameOrName-re
                return { ...coach, usernameOrName: (coach as any).name };
              }
              return undefined;
            }),
            catchError(() => new Observable<Coach | undefined>(obs => { obs.next(undefined); obs.complete(); }))
          )
        );

        return forkJoin(coachRequests).pipe(
          map(coaches => {
            members.forEach(member => {
              const coachId = member.extraFields?.coach_id;
              if (coachId) {
                member.coach = coaches.find(c => c?.id === coachId);
              }
            });
            return { ...response, data: members };
          })
        );
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMsg = 'Ismeretlen hiba történt.';
    if (error.error instanceof ErrorEvent) {
      errorMsg = `Hálózati hiba: ${error.error.message}`;
    } else {
      errorMsg = `Szerver hiba: ${error.status}, üzenet: ${error.message}`;
    }
    return throwError(() => errorMsg);
  }
}
