import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ProgramWorkout } from '../../models/program-workout.model';
import { ApiResponse } from '../../models/api-response.model';
import { API_ENDPOINTS } from '../../api-endpoints';

@Injectable({
  providedIn: 'root',
})
export class ProgramWorkoutService {
  private http = inject(HttpClient);

  private baseUrl = API_ENDPOINTS.programWorkouts;

  // ==========================================================
  // WORKOUT HOZZÁADÁSA PROGRAMHOZ
  // ==========================================================

  addWorkoutToProgram(
    programId: number,
    workoutId: number,
    dayIndex: number = 0,
  ): Observable<ApiResponse<ProgramWorkout>> {
    const payload: ProgramWorkout = {
      programId,
      workoutId,
      dayIndex,
    };

    return this.http.post<ApiResponse<ProgramWorkout>>(`${this.baseUrl}/add`, payload);
  }

  // ==========================================================
  // ELLENŐRZÉS: WORKOUT SZEREPEL-E MÁR PROGRAMBAN
  // ==========================================================

  isWorkoutAssignedToAnyProgram(workoutId: number): Observable<ApiResponse<{ assigned: boolean }>> {
    return this.http.get<ApiResponse<{ assigned: boolean }>>(
      `${this.baseUrl}/workout/${workoutId}/assigned`,
    );
  }

  // ==========================================================
  // PROGRAM WORKOUTJAINAK LEKÉRÉSE
  // ==========================================================

  getWorkoutsForProgram(programId: number): Observable<ApiResponse<ProgramWorkout[]>> {
    return this.http.get<ApiResponse<ProgramWorkout[]>>(`${this.baseUrl}?programId=${programId}`);
  }

  getWorkoutsForProgramByQuery(programId: number): Observable<ApiResponse<ProgramWorkout[]>> {
    return this.http.get<ApiResponse<ProgramWorkout[]>>(`${this.baseUrl}?programId=${programId}`);
  }

  // ==========================================================
  // EGY WORKOUT TÖRLÉSE A PROGRAMBÓL
  // ==========================================================

  deleteProgramWorkout(programId: number, workoutId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${programId}/${workoutId}`);
  }

  // ==========================================================
  // A PROGRAM ÖSSZES WORKOUTJÁNAK TÖRLÉSE
  // ==========================================================

  deleteProgramWorkouts(programId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${programId}`);
  }

  // ==========================================================
  // WORKOUT POZÍCIÓ / DAY INDEX FRISSÍTÉSE
  // ==========================================================

  updateProgramWorkout(id: number, dayIndex: number): Observable<ApiResponse<ProgramWorkout>> {
    const payload = {
      id,
      dayIndex,
    };

    return this.http.put<ApiResponse<ProgramWorkout>>(`${this.baseUrl}/update`, payload);
  }
}
