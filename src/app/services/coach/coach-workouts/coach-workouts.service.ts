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

  private http = inject(HttpClient);
  private apiUrl = API_ENDPOINTS.workouts;

  getMyWorkouts(): Observable<WorkoutListResponse> {
    return this.http.get<WorkoutListResponse>(
      `${this.apiUrl}/my-workouts`
    );
  }

  addWorkout(workout: Workout): Observable<WorkoutResponse> {
    return this.http.post<WorkoutResponse>(
      `${this.apiUrl}/add`,
      workout
    );
  }

  getWorkoutById(id: number): Observable<WorkoutResponse> {
    return this.http.get<WorkoutResponse>(
      `${this.apiUrl}/${id}`
    );
  }

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

  getMyWorkoutsForSelect(): Observable<WorkoutListResponse> {
    return this.http.get<WorkoutListResponse>(
      `${this.apiUrl}/my-workouts-select`
    );
  }

  deleteWorkout(id: number): Observable<WorkoutResponse> {
    return this.http.delete<WorkoutResponse>(
      `${this.apiUrl}/delete/${id}`
    );
  }
}
