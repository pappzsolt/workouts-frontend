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
    dayIndex: number = 1,
  ): Observable<ApiResponse<ProgramWorkout>> {
    const payload: ProgramWorkout = {
      programId,
      workoutId,
      dayIndex,
    };

    return this.http.post<ApiResponse<ProgramWorkout>>(API_ENDPOINTS.programWorkoutAdd, payload);
  }

  // ==========================================================
  // ELLENŐRZÉS: WORKOUT SZEREPEL-E MÁR PROGRAMBAN
  // ==========================================================

  isWorkoutAssignedToAnyProgram(workoutId: number): Observable<ApiResponse<{ assigned: boolean }>> {
    return this.http.get<ApiResponse<{ assigned: boolean }>>(
      API_ENDPOINTS.programWorkoutAssigned(workoutId),
    );
  }

  // ==========================================================
  // PROGRAM WORKOUTJAINAK LEKÉRÉSE
  // ==========================================================

  getWorkoutsForProgram(programId: number): Observable<ApiResponse<ProgramWorkout[]>> {
    return this.http.get<ApiResponse<ProgramWorkout[]>>(API_ENDPOINTS.programWorkoutsByProgram(programId));
  }

  getWorkoutsForProgramByQuery(programId: number): Observable<ApiResponse<ProgramWorkout[]>> {
    return this.http.get<ApiResponse<ProgramWorkout[]>>(API_ENDPOINTS.programWorkoutsByProgram(programId));
  }

  // ==========================================================
  // EGY WORKOUT TÖRLÉSE A PROGRAMBÓL
  // ==========================================================

  deleteProgramWorkout(programId: number, workoutId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(API_ENDPOINTS.programWorkoutDelete(programId, workoutId));
  }

  // ==========================================================
  // A PROGRAM ÖSSZES WORKOUTJÁNAK TÖRLÉSE
  // ==========================================================

  deleteProgramWorkouts(programId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(API_ENDPOINTS.programWorkoutsDelete(programId));
  }

  // ==========================================================
  // WORKOUT POZÍCIÓ / DAY INDEX FRISSÍTÉSE
  // ==========================================================

  updateProgramWorkout(id: number, dayIndex: number): Observable<ApiResponse<ProgramWorkout>> {
    const payload = {
      id,
      dayIndex,
    };

    return this.http.put<ApiResponse<ProgramWorkout>>(API_ENDPOINTS.programWorkoutUpdate, payload);
  }
}
