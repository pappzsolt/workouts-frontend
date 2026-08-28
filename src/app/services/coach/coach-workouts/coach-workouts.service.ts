import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Workout,
  WorkoutResponse,
  WorkoutListResponse
} from '../../../models/workout.model';

import { API_ENDPOINTS } from '../../../api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class CoachWorkoutsService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_ENDPOINTS.workouts;

  /**
   * A bejelentkezett coach által létrehozott
   * összes workout lekérése.
   *
   * GET /api/workouts/my-workouts
   */
  getMyWorkouts(): Observable<Workout[]> {
    return this.http.get<Workout[]>(
      `${this.apiUrl}/my-workouts`
    );
  }
  /**
   * Új workout létrehozása.
   * A coach azonosítóját a backend határozza meg
   * a bejelentkezett felhasználó alapján.
   */
  addWorkout(workout: Workout): Observable<WorkoutResponse> {
    return this.http.post<WorkoutResponse>(
      `${this.apiUrl}/add`,
      workout
    );
  }

  /**
   * Workout lekérése ID alapján.
   */
  getWorkoutById(id: number): Observable<WorkoutResponse> {
    return this.http.get<WorkoutResponse>(
      `${this.apiUrl}/${id}`
    );
  }

  /**
   * Workout módosítása.
   */
  updateWorkout(
    id: number,
    workout: Workout
  ): Observable<WorkoutResponse> {

    const payload: Workout = {
      ...workout,
      id
    };

    return this.http.put<WorkoutResponse>(
      `${this.apiUrl}/update`,
      payload
    );
  }

  /**
   * Workout törlése.
   */
  deleteWorkout(id: number): Observable<WorkoutResponse> {
    return this.http.delete<WorkoutResponse>(
      `${this.apiUrl}/delete/${id}`
    );
  }
}
