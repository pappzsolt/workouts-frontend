import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  ProgramWorkout,
  ProgramWorkoutResponse,
  ProgramWorkoutListResponse
} from '../../models/program-workout.model';

import { API_ENDPOINTS } from '../../api-endpoints';

@Injectable({
  providedIn: 'root'
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
    dayIndex: number = 0
  ): Observable<ProgramWorkoutResponse> {

    const payload: ProgramWorkout = {
      programId,
      workoutId,
      dayIndex
    };

    return this.http.post<ProgramWorkoutResponse>(
      `${this.baseUrl}/add`,
      payload
    );
  }


  // ==========================================================
  // PROGRAM WORKOUTJAINAK LEKÉRÉSE
  // ==========================================================

  getWorkoutsForProgram(
    programId: number
  ): Observable<ProgramWorkoutListResponse> {

    return this.http.get<ProgramWorkoutListResponse>(
      `${this.baseUrl}/${programId}`
    );
  }

  getWorkoutsForProgramByQuery(
    programId: number
  ): Observable<ProgramWorkoutListResponse> {

    return this.http.get<ProgramWorkoutListResponse>(
      `${this.baseUrl}?programId=${programId}`
    );
  }
  // ==========================================================
  // EGY WORKOUT TÖRLÉSE A PROGRAMBÓL
  // ==========================================================

  deleteProgramWorkout(
    programId: number,
    workoutId: number
  ): Observable<ProgramWorkoutResponse> {

    return this.http.delete<ProgramWorkoutResponse>(
      `${this.baseUrl}/${programId}/${workoutId}`
    );
  }


  // ==========================================================
  // A PROGRAM ÖSSZES WORKOUTJÁNAK TÖRLÉSE
  // ==========================================================

  deleteProgramWorkouts(
    programId: number
  ): Observable<ProgramWorkoutResponse> {

    return this.http.delete<ProgramWorkoutResponse>(
      `${this.baseUrl}/${programId}`
    );
  }


  // ==========================================================
  // WORKOUT POZÍCIÓ / DAY INDEX FRISSÍTÉSE
  // ==========================================================

  updateProgramWorkout(
    id: number,
    dayIndex: number
  ): Observable<ProgramWorkoutResponse> {

    const payload = {
      id,
      dayIndex
    };

    return this.http.put<ProgramWorkoutResponse>(
      `${this.baseUrl}/update`,
      payload
    );
  }

}
