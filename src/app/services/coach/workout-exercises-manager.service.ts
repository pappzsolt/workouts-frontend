import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserWorkoutExerciseDto } from '../../models/user-workout-exercise.dto';

@Injectable({
  providedIn: 'root'
})
export class WorkoutExercisesManagerService {

  private readonly baseUrl = '/api/user-workout-exercises';
  private readonly userWorkoutsBaseUrl = 'http://localhost:8080/api/user-workout-exercises/create-with-exercises';


  constructor(private http: HttpClient) {}

  /** 🔹 Lekéri egy user workout összes exercise-át */
  getExercisesForUserWorkout(userWorkoutId: number): Observable<UserWorkoutExerciseDto[]> {
    return this.http.get<UserWorkoutExerciseDto[]>(`${this.baseUrl}/workout/${userWorkoutId}`);
  }

  /** 🔹 Completed mező frissítése */
  updateCompleted(id: number, completed: boolean): Observable<void> {
    const params = new HttpParams().set('completed', completed);
    return this.http.patch<void>(`${this.baseUrl}/${id}/completed`, null, { params });
  }

  /** 🔹 Részletek frissítése (setsDone, feedback, notes) */
  updateDetails(
    id: number,
    setsDone: number,
    feedback?: string,
    notes?: string
  ): Observable<void> {
    let params = new HttpParams().set('setsDone', setsDone);
    if (feedback != null) params = params.set('feedback', feedback);
    if (notes != null) params = params.set('notes', notes);

    return this.http.patch<void>(`${this.baseUrl}/${id}/details`, null, { params });
  }

  /** 🔹 Új user_workout létrehozása és automatikus exercise feltöltés a workout_id alapján */
  addUserWorkout(userId: number, workoutId: number, scheduledAt?: string): Observable<{ userWorkoutId: number }> {
    const body: any = { userId, workoutId };
    if (scheduledAt) body.scheduledAt = scheduledAt; // opcionális
    return this.http.post<{ userWorkoutId: number }>(this.userWorkoutsBaseUrl, body);
  }

}
