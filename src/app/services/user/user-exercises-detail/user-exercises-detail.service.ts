import type { PreviousExercisePerformance } from '../../../models/previous-exercise-performance.model';
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

  getPreviousPerformance(userWorkoutId: number, exerciseId: number): Observable<ApiResponse<PreviousExercisePerformance | null>> {
    return this.http.get<ApiResponse<PreviousExercisePerformance | null>>(
      API_ENDPOINTS.previousExercisePerformance(userWorkoutId, exerciseId),
    );
  }

  getRestTimer(setId: number): Observable<ApiResponse<WebSetRestTimerStatus>> {
    return this.http.get<ApiResponse<WebSetRestTimerStatus>>(API_ENDPOINTS.webSetRestTimer(setId));
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
    actualRpe?: number | null,
    rir?: number | null,
  ): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(API_ENDPOINTS.exerciseSetCompleted, {
      userWorkoutId,
      programId,
      workoutId,
      exerciseId,
      setId,
      completed,
      actualRepetitions,
      actualWeightKg,
      notes,
      ...(actualRpe !== undefined ? { actualRpe, clearActualRpe: actualRpe === null } : {}),
      ...(rir !== undefined ? { rir, clearRir: rir === null } : {}),
    });
  }
}

/** Read-only server-persisted rest timer. Existing workout and mobile APIs are unchanged. */
export interface WebSetRestTimerStatus {
  exists: boolean;
  restDurationSeconds: number | null;
  restStartedAt: string | null;
  restEndsAt: string | null;
  remainingSeconds: number;
  expired: boolean;
}
