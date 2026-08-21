import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';

export interface Workout {
  workoutId: number;
  workoutName: string;
  workoutDescription: string;
  workoutDate: string;           // ISO dátum
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
  providedIn: 'root'
})
export class UserWorkoutsService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_ENDPOINTS.workouts;

  /** Backend hívás – Workouts by program */
  getWorkoutsByProgram(
    programId: number
  ): Observable<Workout[]> {

    return this.http.get<Workout[]>(
      `${this.apiUrl}/program/${programId}`
    );
  }
}
