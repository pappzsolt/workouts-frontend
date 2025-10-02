import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Program, CoachProgramsResponse } from '../../../models/program.model';
import { API_ENDPOINTS } from '../../../api-endpoints'; // helyes útvonal

@Injectable({
  providedIn: 'root'
})
export class CoachProgramService {

  constructor(private http: HttpClient) {}

  /** 🔹 Lekéri a belépett coach programjait */
  getProgramsForLoggedInCoach(): Observable<CoachProgramsResponse> {
    return this.http.get<CoachProgramsResponse>(`${API_ENDPOINTS.programs}/coach/programs`);
  }

  /** 🔹 Összes program lekérése */
  getAllPrograms(): Observable<Program[]> {
    return this.http.get<Program[]>(`${API_ENDPOINTS.programs}/all`);
  }

  /** 🔹 Program lekérése ID alapján */
  getProgramById(id: number): Observable<Program> {
    return this.http.get<Program>(`${API_ENDPOINTS.programs}/${id}`);
  }

  /** 🔹 Új program létrehozása */
  createProgram(program: Program): Observable<Program> {
    return this.http.post<Program>(API_ENDPOINTS.createProgram, program);
  }

  /** 🔹 Program frissítése */
  updateProgram(id: number, program: Program): Observable<Program> {
    return this.http.put<Program>(`${API_ENDPOINTS.programs}/${id}`, program);
  }

  /** 🔹 Program törlése */
  deleteProgram(id: number): Observable<void> {
    return this.http.delete<void>(`${API_ENDPOINTS.programs}/${id}`);
  }

  /** 🔹 Adott coach összes programja (opcionális) */
  getProgramsByCoach(coachId: number): Observable<Program[]> {
    return this.http.get<Program[]>(`${API_ENDPOINTS.programs}/coach/${coachId}`);
  }
}
