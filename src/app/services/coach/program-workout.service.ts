import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ProgramWorkout } from '../../models/program-workout.model';
import { API_ENDPOINTS } from '../../api-endpoints';

export interface ProgramWorkoutResponse {
  status: string;
  message: string;
  data?: ProgramWorkout;
}

export interface ProgramWorkoutListResponse {
  status: string;
  message: string;
  data: ProgramWorkout[];
}

@Injectable({
  providedIn: 'root'
})
export class ProgramWorkoutService {

  private http = inject(HttpClient);
  private baseUrl = API_ENDPOINTS.programWorkouts;

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

  getWorkoutsForProgram(
    programId: number
  ): Observable<ProgramWorkoutListResponse> {

    return this.http.get<ProgramWorkoutListResponse>(
      `${this.baseUrl}/${programId}`
    );
  }

  deleteProgramWorkouts(
    programId: number
  ): Observable<ProgramWorkoutResponse> {

    return this.http.delete<ProgramWorkoutResponse>(
      `${this.baseUrl}/${programId}`
    );
  }

  deleteProgramWorkout(
    programId: number,
    workoutId: number
  ): Observable<ProgramWorkoutResponse> {

    return this.http.delete<ProgramWorkoutResponse>(
      `${this.baseUrl}/${programId}/${workoutId}`
    );
  }

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
