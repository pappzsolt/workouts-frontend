import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LanguageService } from '../../shared/language.service';
import { API_ENDPOINTS } from '../../../api-endpoints';
import { UserWorkoutDetailDto } from '../../../models/user-workout-exercise-detail.dto';
import { ApiResponse } from '../../../models/backend-dto/common/api-response';

@Injectable({
  providedIn: 'root',
})
export class UserExerciseService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = API_ENDPOINTS.exercises;

  /**
   * Lekéri a konkrét USER_WORKOUT execution exercise-eit.
   *
   * GET /api/exercises/my-workout/user-workout/{userWorkoutId}
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
}
