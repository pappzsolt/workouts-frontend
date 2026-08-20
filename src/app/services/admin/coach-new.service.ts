import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';

import {
  Observable,
  catchError,
  throwError
} from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';

import {
  CreateCoachRequest,
  CreateCoachResponse
} from '../../models/create-coach-request.model';

@Injectable({
  providedIn: 'root'
})
export class CoachNewService {

  private readonly apiUrl = API_ENDPOINTS.members;

  constructor(
    private readonly http: HttpClient
  ) {}

  /**
   * Új edző létrehozása.
   */
  createCoach(
    coachData: CreateCoachRequest
  ): Observable<CreateCoachResponse> {

    return this.http
      .post<CreateCoachResponse>(
        this.apiUrl,
        coachData
      )
      .pipe(
        catchError(
          (error: HttpErrorResponse) => {

            const message =
              error.error?.message ??
              'Az edző létrehozása nem sikerült.';

            return throwError(
              () => new Error(message)
            );
          }
        )
      );
  }
}
