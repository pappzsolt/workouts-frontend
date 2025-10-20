import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProgramWorkout } from '../../models/program-workout.model';

@Injectable({
  providedIn: 'root'
})
export class ProgramWorkoutService {
  private baseUrl = 'http://localhost:8080/api/program-workouts'; // backend API

  constructor(private http: HttpClient) {}

  /** 🔹 Új kapcsolat mentése (program + workout + nap index) */
  addWorkoutToProgram(programId: number, workoutId: number, dayIndex: number = 0): Observable<any> {
    const payload: ProgramWorkout = { programId, workoutId, dayIndex };
    return this.http.post(`${this.baseUrl}/add`, payload);
  }

  /** 🔹 Programhoz tartozó workoutok lekérése */
  getWorkoutsForProgram(programId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${programId}`);
  }

  /** 🔹 Összes kapcsolat törlése egy adott programhoz */
  deleteProgramWorkouts(programId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${programId}`);
  }

  /** 🔹 Adott program + workout kapcsolat törlése */
  deleteProgramWorkout(programId: number, workoutId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${programId}/${workoutId}`);
  }

  /** 🔹 Program-Workout kapcsolat frissítése */
  updateProgramWorkout(id: number, dayIndex: number): Observable<any> {
    const payload = { id, dayIndex };
    return this.http.put(`${this.baseUrl}/update`, payload);
  }
}
