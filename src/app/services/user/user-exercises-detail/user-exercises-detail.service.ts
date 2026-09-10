import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';

import { UserWorkoutDetailDto } from '../../../models/user-workout-exercise-detail.dto';

import { ApiResponse } from '../../../models/api-response.model';

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
    programId: number,
    workoutId: number,
  ): Observable<ApiResponse<UserWorkoutDetailDto>> {
    return this.http.get<ApiResponse<UserWorkoutDetailDto>>(
      `${API_ENDPOINTS.exercises}/my-workout/${programId}/${workoutId}`,
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
    programId: number,
    workoutId: number,
    exerciseId: number,
    setId: number,
    completed: boolean,
    actualRepetitions: number | null,
    actualWeightKg: number | null,
    notes: string | null,
  ): Observable<void> {
    return this.http.patch<void>(`${API_ENDPOINTS.exercises}/set-completed`, {
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
