import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CoachProgramService {
  private baseUrl = 'http://localhost:8080/api/programs';

  constructor(private http: HttpClient) {}

  /** 🔹 Összes program lekérése */
  getAllPrograms(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}`);
  }

  /** 🔹 Program lekérése ID alapján */
  getProgramById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  /** 🔹 Program létrehozása */
  createProgram(program: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, program);
  }

  /** 🔹 Program frissítése */
  updateProgram(id: number, program: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, program);
  }

  /** 🔹 Program törlése */
  deleteProgram(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }

  /** 🔹 Adott coach összes programja */
  getProgramsByCoach(coachId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/coach/${coachId}`);
  }
}

