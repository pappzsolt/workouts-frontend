import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkoutExerciseModel } from '../../models/workout-exercise.model';

@Injectable({
  providedIn: 'root'
})
export class WorkoutExerciseService {
  private baseUrl = 'http://localhost:8080/api/workout-exercises'; // backend API

  constructor(private http: HttpClient) {}

  /** 🔹 Új WorkoutExercise rekord hozzáadása (teljes objektum) */
  addWorkoutExercise(workoutExercise: WorkoutExerciseModel): Observable<any> {
    return this.http.post(`${this.baseUrl}/add`, workoutExercise);
  }

  /** 🔹 Új WorkoutExercise rekord hozzáadása csak workoutId és exerciseId */
  addWorkoutExerciseSimple(workoutId: number, exerciseId: number): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/add-simple?workoutId=${workoutId}&exerciseId=${exerciseId}`,
      null
    );
  }

  /** 🔹 Rekord frissítése (id alapján, a többi mező opcionális) */
  updateWorkoutExercise(workoutExercise: WorkoutExerciseModel): Observable<any> {
    return this.http.put(`${this.baseUrl}/update`, workoutExercise);
  }

  /** 🔹 Rekord törlése ID alapján */
  deleteWorkoutExerciseById(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete/${id}`);
  }

  /** 🔹 Rekord törlése userId + workoutId + exerciseId alapján */
  deleteWorkoutExerciseByUserWorkoutExercise(
    userId: number,
    workoutId: number,
    exerciseId: number
  ): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${userId}/${workoutId}/${exerciseId}`);
  }

  /** 🔹 Rekord törlése user nélküli változat: csak workoutId + exerciseId */
  deleteWorkoutExerciseSimple(workoutId: number, exerciseId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete-simple?workoutId=${workoutId}&exerciseId=${exerciseId}`);
  }

  /** 🔹 WorkoutExercise-ek lekérése workoutId alapján (userId nélkül) */
  getWorkoutExercisesByWorkoutId(workoutId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/by-workout/${workoutId}`);
  }

}
