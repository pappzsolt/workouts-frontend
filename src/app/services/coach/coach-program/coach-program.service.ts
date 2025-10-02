import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Program, CoachProgramsResponse } from '../../../models/program.model';

@Injectable({
  providedIn: 'root'
})
export class CoachProgramService {
  private baseUrl = 'http://localhost:8080/api/programs';
  private baseUrlNew = 'http://localhost:8080/api/user-programs/create';
  constructor(private http: HttpClient) {}

  /** 🔹 Lekéri a belépett coach programjait */
  getProgramsForLoggedInCoach(): Observable<CoachProgramsResponse> {
    return this.http.get<CoachProgramsResponse>(`${this.baseUrl}/coach/programs`);
  }

  /** 🔹 Összes program lekérése */
  getAllPrograms(): Observable<Program[]> {
    return this.http.get<Program[]>(`${this.baseUrl}/all`);
  }

  /** 🔹 Program lekérése ID alapján */
  getProgramById(id: number): Observable<Program> {
    return this.http.get<Program>(`${this.baseUrl}/${id}`);
  }

  /** 🔹 Új program létrehozása */
  createProgram(program: Program): Observable<Program> {
    return this.http.post<Program>(`${this.baseUrlNew}`, program);
  }

  /** 🔹 Program frissítése */
  updateProgram(id: number, program: Program): Observable<Program> {
    return this.http.put<Program>(`${this.baseUrl}/${id}`, program);
  }

  /** 🔹 Program törlése */
  deleteProgram(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** 🔹 Adott coach összes programja (opcionális) */
  getProgramsByCoach(coachId: number): Observable<Program[]> {
    return this.http.get<Program[]>(`${this.baseUrl}/coach/${coachId}`);
  }
}

