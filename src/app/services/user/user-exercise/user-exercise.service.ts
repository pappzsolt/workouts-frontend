import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../api-endpoints';
import { WorkoutDto } from '../../../models/exercise.model';

@Injectable({
  providedIn: 'root'
})
export class UserExerciseService {

  private apiUrl = 'http://localhost:8080/api/exercises';

  constructor(private http: HttpClient) {}

  /**
   * Lekéri a belépett user adott workoutjához tartozó exercise-okat.
   */
  getWorkoutExercises(workoutId: number): Observable<WorkoutDto> {
    return this.http.get<WorkoutDto>(
      `${API_ENDPOINTS.exercises}/my-workout/${workoutId}`
    );
  }
}
