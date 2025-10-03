import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Workout, WorkoutResponse ,WorkoutListResponse} from '../../../models/workout.model';



@Injectable({
  providedIn: 'root'
})
export class CoachWorkoutsService {

  private apiUrl = 'http://localhost:8080/api/workouts'; // állítsd be a backend URL-ednek megfelelően

  constructor(private http: HttpClient) {}

  getMyWorkouts(): Observable<WorkoutListResponse> {
    return this.http.get<WorkoutListResponse>(`${this.apiUrl}/my-workouts`);
  }


  addWorkout(workout: Workout): Observable<WorkoutResponse> {
    return this.http.post<WorkoutResponse>(`${this.apiUrl}/add`, workout);
  }

  updateWorkout(workout: Workout): Observable<WorkoutResponse> {
    return this.http.put<WorkoutResponse>(`${this.apiUrl}/update`, workout);
  }

  deleteWorkout(id: number): Observable<WorkoutResponse> {
    return this.http.delete<WorkoutResponse>(`${this.apiUrl}/delete/${id}`);
  }
}
