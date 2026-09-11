import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../../models/api-response.model';
import { API_ENDPOINTS } from '../../api-endpoints';

@Injectable({
  providedIn: 'root',
})
export class WorkoutExerciseService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = API_ENDPOINTS.workoutExercises;

  // ==========================================================
  // EXERCISE HOZZÁRENDELÉSE WORKOUT-HOZ
  // ==========================================================

  /**

   Exercise hozzárendelése egy workouthoz.


   POST:
   /api/workout-exercises/assign


   Query params:
   workoutId
   exerciseId
   */
  assignExerciseToWorkout(workoutId: number, exerciseId: number): Observable<ApiResponse<void>> {
    const params = new HttpParams().set('workoutId', workoutId).set('exerciseId', exerciseId);
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/assign`, null, { params });
  }

  // ==========================================================
  // RÉGI METÓDUS – KOMPATIBILITÁS
  // ==========================================================

  /**

   Régi metódus kompatibilitás miatt.


   Az új backend endpoint:
   POST /assign
   */
  addWorkoutExerciseSimple(workoutId: number, exerciseId: number): Observable<ApiResponse<void>> {
    return this.assignExerciseToWorkout(workoutId, exerciseId);
  }

  // ==========================================================
  // EXERCISE TÖRLÉSE WORKOUT-BÓL
  // ==========================================================

  /**

   Exercise eltávolítása egy workoutból.


   DELETE:
   /api/workout-exercises/delete


   Query params:
   workoutId
   exerciseId
   */
  deleteExerciseFromWorkout(workoutId: number, exerciseId: number): Observable<ApiResponse<void>> {
    const params = new HttpParams().set('workoutId', workoutId).set('exerciseId', exerciseId);
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/delete`, { params });
  }

  // ==========================================================
  // EXERCISE SORREND MÓDOSÍTÁSA
  // ==========================================================

  /**

   Workout-exercise kapcsolat sorrendjének módosítása.


   PUT:
   /api/workout-exercises/order-index


   Query params:
   workoutId
   exerciseId
   orderIndex
   */
  updateOrderIndex(
    workoutId: number,
    exerciseId: number,
    orderIndex: number,
  ): Observable<ApiResponse<void>> {
    const params = new HttpParams()
      .set('workoutId', workoutId)
      .set('exerciseId', exerciseId)
      .set('orderIndex', orderIndex);
    return this.http.put<ApiResponse<void>>(`${this.baseUrl}/order-index`, null, { params });
  }
}
