import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { API_ENDPOINTS } from '../../api-endpoints';

import { CreateUserRequest, CreateUserResponse } from '../../models/user-new-model';

@Injectable({
  providedIn: 'root',
})
export class UserNewService {
  private readonly apiUrl = API_ENDPOINTS.members;

  constructor(private readonly http: HttpClient) {}

  createUser(userData: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http
      .post<CreateUserResponse>(this.apiUrl, userData)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}
