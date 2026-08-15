import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkoutExerciseModel } from '../../models/workout-exercise.model';
import { API_ENDPOINTS } from '../../api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class WorkoutExerciseService {

  private readonly baseUrl = API_ENDPOINTS.workoutExercises;

  constructor(private http: HttpClient) {}

  /**
   * Exercise hozzárendelése egy workouthoz.
   *
   * POST:
   * /api/workout-exercises/assign?workoutId=226&exerciseId=1004
   */
  assignExerciseToWorkout(
    workoutId: number,
    exerciseId: number
  ): Observable<any> {

    const params = new HttpParams()
      .set('workoutId', workoutId)
      .set('exerciseId', exerciseId);

    return this.http.post<any>(
      `${this.baseUrl}/assign`,
      null,
      { params }
    );
  }

  /**
   * Régi metódus kompatibilitás miatt.
   *
   * Az új backend endpoint már /assign.
   */
  addWorkoutExerciseSimple(
    workoutId: number,
    exerciseId: number
  ): Observable<any> {
    return this.assignExerciseToWorkout(workoutId, exerciseId);
  }

  /**
   * WorkoutExercise-ek lekérése workoutId alapján.
   *
   * FIGYELEM:
   * Ehhez jelenleg nincs megmutatva a Java controller endpointja.
   */
  getWorkoutExercisesByWorkoutId(
    workoutId: number
  ): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/workout/${workoutId}`
    );
  }

  /**
   * WorkoutExercise törlése ID alapján.
   *
   * FIGYELEM:
   * Ehhez jelenleg nincs megmutatva a Java controller endpointja.
   */
  deleteWorkoutExerciseById(
    id: number
  ): Observable<any> {
    return this.http.delete<any>(
      `${this.baseUrl}/delete/${id}`
    );
  }

  /**
   * Teljes WorkoutExercise objektum hozzáadása.
   *
   * Csak akkor használható, ha a backendben van /add endpoint.
   */
  addWorkoutExercise(
    workoutExercise: WorkoutExerciseModel
  ): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/add`,
      workoutExercise
    );
  }

  /**
   * WorkoutExercise frissítése.
   *
   * Csak akkor használható, ha a backendben van /update endpoint.
   */
  updateWorkoutExercise(
    workoutExercise: WorkoutExerciseModel
  ): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/update`,
      workoutExercise
    );
  }
}
