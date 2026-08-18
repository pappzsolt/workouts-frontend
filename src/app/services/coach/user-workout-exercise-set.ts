import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { UserWorkoutExerciseSetModel } from '../../models/user-workout-exercise-set.model';

@Injectable({
  providedIn: 'root'
})
export class UserWorkoutExerciseSetService {

  private readonly baseUrl =
    'http://localhost:8080/api/user-workout-exercise-sets';

  constructor(private http: HttpClient) {}

  /**
   * Egy user_workout_exercise összes set-jének lekérése.
   */
  getSetsByUserWorkoutExerciseId(
    userWorkoutExerciseId: number
  ): Observable<UserWorkoutExerciseSetModel[]> {

    return this.http.get<UserWorkoutExerciseSetModel[]>(
      `${this.baseUrl}/${userWorkoutExerciseId}`
    );
  }

  /**
   * Új set hozzáadása.
   */
  addSet(
    userWorkoutExerciseId: number
  ): Observable<any> {

    return this.http.post(
      `${this.baseUrl}/${userWorkoutExerciseId}/add`,
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
      `${this.baseUrl}/${id}`,
      data
    );
  }

  /**
   * Set törlése ID alapján.
   */
  deleteSet(id: number): Observable<any> {

    return this.http.delete(
      `${this.baseUrl}/${id}`
    );
  }
}
