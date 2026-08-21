import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Workout, WorkoutResponse, WorkoutListResponse } from '../../../models/workout.model';
import { API_ENDPOINTS } from '../../../api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class CoachWorkoutsService {

  private apiUrl = API_ENDPOINTS.workouts;

  constructor(private http: HttpClient) {}

  // 🔹 Saját workoutok lekérése
  getMyWorkouts(): Observable<WorkoutListResponse> {
    return this.http.get<WorkoutListResponse>(
      `${this.apiUrl}/my-workouts`
    );
  }

  // 🔹 Új workout hozzáadása
  addWorkout(workout: Workout): Observable<WorkoutResponse> {
    return this.http.post<WorkoutResponse>(
      `${this.apiUrl}/add`,
      workout
    );
  }

  // 🔹 Workout betöltése ID alapján
  getWorkoutById(id: number): Observable<WorkoutResponse> {
    return this.http.get<WorkoutResponse>(
      `${this.apiUrl}/${id}`
    );
  }

  // 🔹 Workout frissítése ID-vel
  updateWorkout(id: number, workout: Workout): Observable<WorkoutResponse> {
    workout.id = id;

    return this.http.put<WorkoutResponse>(
      `${this.apiUrl}/update`,
      workout
    );
  }

  // 🔹 Saját workoutok lekérése select komponenshez
  getMyWorkoutsForSelect(): Observable<WorkoutListResponse> {
    return this.http.get<WorkoutListResponse>(
      `${this.apiUrl}/my-workouts-select`
    );
  }

  // 🔹 Workout törlése
  deleteWorkout(id: number): Observable<WorkoutResponse> {
    return this.http.delete<WorkoutResponse>(
      `${this.apiUrl}/delete/${id}`
    );
  }
}
