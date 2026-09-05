import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';
import { WorkoutDto } from '../../../models/exercise.model';

@Injectable({
  providedIn: 'root'
})
export class UserExerciseService {

  private readonly http = inject(HttpClient);

  private readonly baseUrl = API_ENDPOINTS.exercises;

  /**
   * Lekéri a belépett user adott programjához tartozó workout
   * exercise-eit.
   */
  getWorkoutExercises(
    programId: number,
    workoutId: number
  ): Observable<WorkoutDto> {

    return this.http.get<WorkoutDto>(
      `${this.baseUrl}/my-workout/${programId}/${workoutId}`
    );
  }
}
