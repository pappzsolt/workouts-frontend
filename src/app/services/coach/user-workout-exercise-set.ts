import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import { UserWorkoutExerciseSetModel } from '../../models/user-workout-exercise-set.model';

@Injectable({
  providedIn: 'root'
})
export class UserWorkoutExerciseSetService {

  constructor(private http: HttpClient) {}

  /**
   * Egy user_workout_exercise összes set-jének lekérése.
   */
  getSetsByUserWorkoutExerciseId(
    userWorkoutExerciseId: number
  ): Observable<UserWorkoutExerciseSetModel[]> {

    return this.http.get<UserWorkoutExerciseSetModel[]>(
      `${API_ENDPOINTS.userWorkoutExerciseSets}/${userWorkoutExerciseId}`
    );
  }

  /**
   * Új set hozzáadása.
   */
  addSet(
    userWorkoutExerciseId: number
  ): Observable<any> {

    return this.http.post(
      `${API_ENDPOINTS.userWorkoutExerciseSets}/${userWorkoutExerciseId}/add`,
      {}
    );
  }

  /**
   * Egy set módosítása.
   */
  updateSet(
    id: number,
    data: Partial<UserWorkoutExerciseSetModel>
  ): Observable<any> {

    return this.http.put(
      `${API_ENDPOINTS.userWorkoutExerciseSets}/${id}`,
      data
    );
  }

  /**
   * Set törlése ID alapján.
   */
  deleteSet(id: number): Observable<any> {

    return this.http.delete(
      `${API_ENDPOINTS.userWorkoutExerciseSets}/${id}`
    );
  }
}
