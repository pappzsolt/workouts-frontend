import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CoachNewService {
  private apiUrl = 'http://localhost:8080/api/members';

  constructor(private http: HttpClient) {}

  // Új coach létrehozása
  createCoach(coachData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, coachData)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
