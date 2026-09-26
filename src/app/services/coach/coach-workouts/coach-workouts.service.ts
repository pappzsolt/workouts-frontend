import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { WorkoutDto } from '../../../models/exercise.model';
import { PagedWorkoutResponse, Workout, WorkoutResponse } from '../../../models/workout.model';
import { ApiResponse } from '../../../models/api-response.model';

import { API_ENDPOINTS } from '../../../api-endpoints';

@Injectable({
  providedIn: 'root',
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
  getMyWorkouts(): Observable<ApiResponse<Workout[]>> {
    return this.http.get<ApiResponse<Workout[]>>(API_ENDPOINTS.myWorkouts);
  }

  /**
   * A bejelentkezett coach egyedi workoutjainak lekérése.
   *
   * GET /api/workouts/my-workouts/unique
   */
  getUniqueMyWorkouts(): Observable<Workout[]> {
    return this.http.get<Workout[]>(API_ENDPOINTS.uniqueMyWorkouts);
  }

  /**
   * Egyedi workoutok exercise-okkal.
   *
   * GET /api/exercises/workouts/unique
   */
  getUniqueWorkoutsWithExercises(): Observable<ApiResponse<WorkoutDto[]>> {
    return this.http.get<ApiResponse<WorkoutDto[]>>(API_ENDPOINTS.uniqueWorkoutsWithExercises);
  }

  /**
   * Új workout létrehozása.
   */
  addWorkout(workout: Workout): Observable<WorkoutResponse> {
    return this.http.post<WorkoutResponse>(API_ENDPOINTS.workoutAdd, workout);
  }

  /**
   * Workout lekérése ID alapján.
   */
  getWorkoutById(id: number): Observable<WorkoutResponse> {
    return this.http.get<WorkoutResponse>(API_ENDPOINTS.workoutById(id));
  }

  /**
   * Workout módosítása.
   */
  updateWorkout(id: number, workout: Workout): Observable<WorkoutResponse> {
    const payload: Workout = {
      ...workout,
      id,
    };

    return this.http.put<WorkoutResponse>(API_ENDPOINTS.workoutUpdate, payload);
  }

  /**
   * Workout törlése.
   */
  deleteWorkout(id: number): Observable<WorkoutResponse> {
    return this.http.delete<WorkoutResponse>(API_ENDPOINTS.workoutDelete(id));
  }

  /**
   * A bejelentkezett coach workoutjainak keresése és lapozása.
   *
   * GET /api/workouts/my-workouts/search
   */
  searchMyWorkouts(
    search: string,
    page: number = 0,
    size: number = 6,
    language: string = 'hu',
    sortDirection: 'asc' | 'desc' = 'asc',
  ): Observable<PagedWorkoutResponse> {
    const params = new HttpParams()
      .set('search', search)
      .set('page', page)
      .set('size', size)
      .set('language', language)
      .set('sortDirection', sortDirection);

    return this.http.get<PagedWorkoutResponse>(API_ENDPOINTS.myWorkoutsSearch, { params });
  }
}
