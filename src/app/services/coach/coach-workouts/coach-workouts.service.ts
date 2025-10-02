import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Workout, WorkoutResponse } from '../../../models/workout.model';



@Injectable({
  providedIn: 'root'
})
export class CoachWorkoutsService {

  private apiUrl = 'http://localhost:8080/api/workouts'; // állítsd be a backend URL-ednek megfelelően

  constructor(private http: HttpClient) {}

  getProgramWorkouts(programId: number, userId: number): Observable<Workout[]> {
    return this.http.get<Workout[]>(`${this.apiUrl}/program/${programId}/user/${userId}`);
  }

  addWorkout(workout: Workout): Observable<WorkoutResponse> {
    return this.http.post<WorkoutResponse>(`${this.apiUrl}`, workout);
  }

  updateWorkout(workout: Workout): Observable<WorkoutResponse> {
    return this.http.put<WorkoutResponse>(`${this.apiUrl}/${workout.id}`, workout);
  }

  deleteWorkout(id: number): Observable<WorkoutResponse> {
    return this.http.delete<WorkoutResponse>(`${this.apiUrl}/${id}`);
  }
}
