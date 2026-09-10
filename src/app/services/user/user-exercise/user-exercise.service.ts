import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';
import { WorkoutDto } from '../../../models/exercise.model';
import { ApiResponse } from '../../../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class UserExerciseService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = API_ENDPOINTS.exercises;

  /**
   * Lekéri a belépett user adott programjához tartozó workout
   * exercise-eit.
   *
   * GET /api/exercises/my-workout/{programId}/{workoutId}
   */
  getWorkoutExercises(programId: number, workoutId: number): Observable<ApiResponse<WorkoutDto>> {
    return this.http.get<ApiResponse<WorkoutDto>>(
      `${this.baseUrl}/my-workout/${programId}/${workoutId}`,
    );
  }
}
