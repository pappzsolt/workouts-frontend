import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { API_ENDPOINTS } from '../../api-endpoints';

import { CreateUserRequest } from '../../models/user-new-model';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';

@Injectable({
  providedIn: 'root',
})
export class UserNewService {
  private readonly apiUrl = API_ENDPOINTS.members;

  constructor(private readonly http: HttpClient) {}

  createUser(userData: CreateUserRequest): Observable<ApiResponse<void>> {
    return this.http
      .post<ApiResponse<void>>(this.apiUrl, userData)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}
