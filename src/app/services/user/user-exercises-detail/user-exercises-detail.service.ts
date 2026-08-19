import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';
import {
  UserWorkoutDetailDto
} from '../../../models/user-workout-exercise-detail.dto';

@Injectable({
  providedIn: 'root'
})
export class UserExerciseDetailService {

  constructor(private http: HttpClient) {}

  /**
   * Lekéri a belépett user adott workoutját
   * az exercise-ekkel és azok saját setjeivel.
   */
  getWorkoutExercises(
    workoutId: number
  ): Observable<UserWorkoutDetailDto> {
    return this.http.get<UserWorkoutDetailDto>(
      `${API_ENDPOINTS.exercises}/my-workout/${workoutId}`
    );
  }

  /**
   * Egy konkrét set completed állapotának módosítása.
   */
  updateSetCompleted(
    workoutId: number,
    exerciseId: number,
    setId: number,
    completed: boolean
  ): Observable<void> {

    return this.http.patch<void>(
      `${API_ENDPOINTS.exercises}/set-completed`,
      {
        workoutId,
        exerciseId,
        setId,
        completed
      }
    );
  }
}
