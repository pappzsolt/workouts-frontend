import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CoachNewService {
  private apiUrl = 'http://localhost:8080/api/coaches';

  constructor(private http: HttpClient) {}

  // Új coach létrehozása
  createCoach(coachData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, coachData);
  }

  // Egy coach lekérése ID alapján
  getCoachById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Coach frissítése
  updateCoach(id: number, coachData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, coachData);
  }
}
