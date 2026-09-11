import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';
import { ApiResponse } from '../../../models/api-response.model';

export interface Workout {
  workoutId: number;
  workoutName: string;
  workoutDescription: string;
  workoutDate: string;
  durationMinutes: number;
  intensityLevel: string;
  dayIndex: number;
  completed: boolean | null;
  performedAt: string | null;
  actualSets: number | null;
  actualRepetitions: number | null;
  weightUsed: number | null;
  durationSeconds: number | null;
  feedback: string | null;
  notes: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class UserWorkoutsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_ENDPOINTS.workouts;

  /** Backend hívás – Workouts by program */
  getWorkoutsByProgram(programId: number): Observable<Workout[]> {
    return this.http
      .get<ApiResponse<Workout[]>>(`${this.apiUrl}/program/${programId}`)
      .pipe(map((response) => response.data));
  }
}
