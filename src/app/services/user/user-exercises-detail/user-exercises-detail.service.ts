import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';

import { UserWorkoutDetailDto } from '../../../models/user-workout-exercise-detail.dto';

import { ApiResponse } from '../../../models/backend-dto/common/api-response';

@Injectable({
  providedIn: 'root',
})
export class UserExerciseDetailService {
  private readonly http = inject(HttpClient);

  /**
   * Lekéri a belépett user adott programjához tartozó workoutját
   * az exercise-ekkel és azok saját setjeivel.
   *
   * Backend válasz:
   *
   * {
   *   success: true,
   *   data: {
   *     ...
   *   },
   *   message: null
   * }
   */
  getWorkoutExercises(
    userWorkoutId: number,
    language: string,
  ): Observable<ApiResponse<UserWorkoutDetailDto>> {
    return this.http.get<ApiResponse<UserWorkoutDetailDto>>(
      API_ENDPOINTS.userWorkoutExercisesByWorkout(userWorkoutId),
      {
        params: { language },
      },
    );
  }

  /**
   * Egy konkrét set adatainak mentése.
   *
   * Mentésre kerül:
   * - completed
   * - actualRepetitions
   * - actualWeightKg
   * - notes
   */
  updateSetCompleted(
    userWorkoutId: number,
    programId: number,
    workoutId: number,
    exerciseId: number,
    setId: number,
    completed: boolean,
    actualRepetitions: number | null,
    actualWeightKg: number | null,
    notes: string | null,
  ): Observable<void> {
    return this.http.patch<void>(API_ENDPOINTS.exerciseSetCompleted, {
      userWorkoutId,
      programId,
      workoutId,
      exerciseId,
      setId,
      completed,
      actualRepetitions,
      actualWeightKg,
      notes,
    });
  }
}
