import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserWorkoutExerciseDto } from '../../models/user-workout-exercise.dto';

@Injectable({
  providedIn: 'root'
})
export class WorkoutExercisesManagerService {

  private readonly baseUrl =
    'http://localhost:8080/api/user-workout-exercises';

  private readonly userWorkoutsBaseUrl =
    'http://localhost:8080/api/user-workout-exercises/create-with-exercises';

  constructor(private http: HttpClient) {}

  /** Lekéri egy user workout összes exercise-át */
  getExercisesForUserWorkout(
    userWorkoutId: number
  ): Observable<UserWorkoutExerciseDto[]> {
    return this.http.get<UserWorkoutExerciseDto[]>(
      `${this.baseUrl}/workout/${userWorkoutId}`
    );
  }

  /** Completed mező frissítése */
  updateCompleted(
    id: number,
    completed: boolean
  ): Observable<void> {

    const params = new HttpParams()
      .set('completed', completed);

    return this.http.patch<void>(
      `${this.baseUrl}/${id}/completed`,
      null,
      { params }
    );
  }

  /** Részletek frissítése */
  updateDetails(
    id: number,
    setsDone: number,
    feedback?: string,
    notes?: string
  ): Observable<void> {

    let params = new HttpParams()
      .set('setsDone', setsDone);

    if (feedback != null) {
      params = params.set('feedback', feedback);
    }

    if (notes != null) {
      params = params.set('notes', notes);
    }

    return this.http.patch<void>(
      `${this.baseUrl}/${id}/details`,
      null,
      { params }
    );
  }

  /**
   * Program hozzárendelése userhez.
   *
   * A coach a felületen:
   * - usert választ
   * - programot választ
   * - dátumot választ
   *
   * A backend ezek alapján létrehozza:
   * user_workouts
   * user_workout_exercises
   */
  addUserWorkout(
    userId: number,
    programId: number,
    scheduledAt?: string
  ): Observable<{ userWorkoutId: number }> {

    const body: {
      userId: number;
      programId: number;
      scheduledAt?: string;
    } = {
      userId,
      programId
    };

    if (scheduledAt) {
      body.scheduledAt = scheduledAt;
    }

    return this.http.post<{ userWorkoutId: number }>(
      this.userWorkoutsBaseUrl,
      body
    );
  }

  /**
   * Teljes program + workout + exercise + user adatok lekérése.
   */
  getUserProgramWithExercises(
    userId: number,
    programId: number
  ): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.baseUrl}/user-program/${userId}/${programId}`
    );
  }

  /**
   * Egy már létező user workout ütemezett dátumának módosítása.
   */
  updateUserWorkoutScheduledDate(
    userWorkoutId: number,
    scheduledAt: string
  ): Observable<void> {

    return this.http.patch<void>(
      `${this.baseUrl}/reschedule-user-workout`,
      {
        userWorkoutId,
        scheduledAt
      }
    );
  }
  /**
   * A belépett user számára ütemezett workoutok lekérése.
   */
  getScheduledWorkouts(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.baseUrl}/scheduled-workouts`
    );
  }

}
