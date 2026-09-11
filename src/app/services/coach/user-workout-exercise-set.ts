import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import { ApiResponse } from '../../models/api-response.model';
import { UserWorkoutExerciseSetModel } from '../../models/user-workout-exercise-set.model';

@Injectable({
  providedIn: 'root',
})
export class UserWorkoutExerciseSetService {
  constructor(private http: HttpClient) {}

  /**
   * Egy user_workout_exercise összes set-jének lekérése.
   */
  getSetsByUserWorkoutExerciseId(
    userWorkoutExerciseId: number,
  ): Observable<ApiResponse<UserWorkoutExerciseSetModel[]>> {
    return this.http.get<ApiResponse<UserWorkoutExerciseSetModel[]>>(
      `${API_ENDPOINTS.userWorkoutExerciseSets}/${userWorkoutExerciseId}`,
    );
  }

  /**
   * Új set hozzáadása.
   */
  addSet(userWorkoutExerciseId: number): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(
      `${API_ENDPOINTS.userWorkoutExerciseSets}/${userWorkoutExerciseId}/add`,
      {},
    );
  }

  /**
   * Egy set módosítása.
   */
  updateSet(id: number, data: Partial<UserWorkoutExerciseSetModel>): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(`${API_ENDPOINTS.userWorkoutExerciseSets}/${id}`, data);
  }

  /**
   * Set törlése ID alapján.
   */
  deleteSet(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${API_ENDPOINTS.userWorkoutExerciseSets}/${id}`);
  }
}
