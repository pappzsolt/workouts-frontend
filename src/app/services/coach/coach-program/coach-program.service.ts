import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Program, CoachProgramsResponse,ApiResponse,ProgramDto } from '../../../models/program.model';
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
  getProgramById(id: number): Observable<ApiResponse<ProgramDto>> {
    return this.http.get<ApiResponse<ProgramDto>>(`${API_ENDPOINTS.programs}/${id}`);
  }

  /** 🔹 Új program létrehozása */
  createProgram(program: Program): Observable<Program> {
    return this.http.post<Program>(API_ENDPOINTS.createProgram, program);
  }

  updateProgram(id: number, program: Program): Observable<ApiResponse<ProgramDto>> {
    return this.http.put<ApiResponse<ProgramDto>>(`${API_ENDPOINTS.programs}/${id}`, program);
  }


  /** 🔹 Program törlése */
  deleteProgram(id: number): Observable<void> {
    return this.http.delete<void>(`${API_ENDPOINTS.programs}/${id}`);
  }
  assignWorkoutToProgram(programId: number, workoutId: number) {
    return this.http.post(`/api/programs/${programId}/assign-workout/`, { workoutId });
  }

}
