// user-new.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserNewService {
  private apiUrl = 'http://localhost:8080/api/members';

  constructor(private http: HttpClient) {}

  // Új user létrehozása
  createUser(userData: any): Observable<any> {
    // userData tartalmazza: type, username, email, passwordHash, avatarUrl, age, weight, height, gender, goals, coachId, roleIds
    return this.http.post<any>(this.apiUrl, userData)
      .pipe(catchError(this.handleError));
  }

  // Hibakezelés
  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
