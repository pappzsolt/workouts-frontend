import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../../models/api-response.model';
import { UserWorkoutExerciseDto } from '../../models/user-workout-exercise.dto';
import { ScheduledWorkout } from '../user/user-workouts/user-workouts.service';

interface UserProgramExerciseRow {
  scheduled_date?: string | null;
  scheduledAt?: string | null;
  program_day_index?: number;
  user_workout_id?: number;
  userWorkoutId?: number;
  program_workout_id?: number;
  programWorkoutId?: number;
  workout_id?: number;
  workoutId?: number;
  workout_name?: string | null;
  workoutName?: string | null;
  workout_completed?: boolean;
  workoutCompleted?: boolean;
  user_workout_exercise_id?: number;
  workout_exercise_id?: number;
  exercise_order?: number;
  exercise_id?: number;
  exercise_name?: string | null;
  exercise_completed?: boolean;
  sets_done?: number | null;
  feedback?: string | null;
  notes?: string | null;
  performed_at?: string | null;
}

interface ScheduledWorkoutRecord {
  userWorkoutId?: number;
  user_workout_id?: number;
  programWorkoutId?: number;
  program_workout_id?: number;
  workoutId?: number;
  workout_id?: number;
  programId?: number;
  program_id?: number;
  scheduledAt?: string | null;
  scheduled_at?: string | null;
  completed?: boolean | null;
  workoutName?: string | null;
  workout_name?: string | null;
}

interface ScheduledWorkoutsSearchResponse {
  content?: ScheduledWorkoutRecord[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}
import { API_ENDPOINTS } from '../../api-endpoints';

@Injectable({
  providedIn: 'root',
})
export class WorkoutExercisesManagerService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = API_ENDPOINTS.userWorkoutExercises;

  private readonly userWorkoutsBaseUrl = API_ENDPOINTS.createUserWorkoutWithExercises;

  /**
   * Lekéri egy user workout összes exercise-át.
   */
  getExercisesForUserWorkout(userWorkoutId: number): Observable<UserWorkoutExerciseDto[]> {
    return this.http
      .get<ApiResponse<UserWorkoutExerciseDto[]>>(API_ENDPOINTS.userWorkoutExerciseByWorkout(userWorkoutId))
      .pipe(map((response: ApiResponse<UserWorkoutExerciseDto[]>) => response.data));
  }

  /**
   * Completed mező frissítése.
   */
  updateCompleted(id: number, completed: boolean): Observable<void> {
    const params = new HttpParams().set('completed', completed);

    return this.http.patch<void>(API_ENDPOINTS.userWorkoutExerciseCompleted(id), null, { params });
  }

  /**
   * Részletek frissítése.
   */
  updateDetails(id: number, setsDone: number, feedback?: string, notes?: string): Observable<void> {
    let params = new HttpParams().set('setsDone', setsDone);

    if (feedback != null) {
      params = params.set('feedback', feedback);
    }

    if (notes != null) {
      params = params.set('notes', notes);
    }

    return this.http.patch<void>(API_ENDPOINTS.userWorkoutExerciseDetails(id), null, { params });
  }

  /**
   * User workoutok létrehozása exercise-ekkel.
   */
  addUserWorkout(
    userId: number,
    programId: number,
    scheduledAt?: string,
  ): Observable<ApiResponse<number[]>> {
    const body: {
      userId: number;
      programId: number;
      scheduledAt?: string;
    } = {
      userId,
      programId,
    };

    if (scheduledAt) {
      body.scheduledAt = scheduledAt;
    }

    return this.http.post<ApiResponse<number[]>>(this.userWorkoutsBaseUrl, body);
  }

  /**
   * Teljes program + workout + exercise + user adatok lekérése.
   */
  getUserProgramWithExercises(userId: number, programId: number): Observable<ApiResponse<UserProgramExerciseRow[]>> {
    return this.http.get<ApiResponse<UserProgramExerciseRow[]>>(API_ENDPOINTS.userWorkoutExercisesByUserProgram(userId, programId));
  }

  /**
   * Egy már létező user workout
   * ütemezett dátumának módosítása.
   */
  updateUserWorkoutScheduledDate(
    userWorkoutId: number,
    scheduledAt: string,
  ): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(API_ENDPOINTS.rescheduleUserWorkout, {
      userWorkoutId,
      scheduledAt,
    });
  }

  /**
   * A belépett user számára ütemezett workoutok lekérése.
   */
  getScheduledWorkouts(): Observable<ApiResponse<ScheduledWorkout[]>> {
    return this.http
      .get<ApiResponse<ScheduledWorkoutRecord[]>>(API_ENDPOINTS.scheduledUserWorkouts)
      .pipe(
        map((response) => ({
          ...response,
          data: (response.data ?? []).reduce<ScheduledWorkout[]>((workouts, item) => {
            const userWorkoutId = Number(
              item.userWorkoutId ?? item.user_workout_id,
            );
            const programWorkoutId = Number(
              item.programWorkoutId ?? item.program_workout_id,
            );
            const workoutId = Number(item.workoutId ?? item.workout_id);
            const programId = Number(item.programId ?? item.program_id);

            if (
              !Number.isFinite(userWorkoutId) || userWorkoutId <= 0 ||
              !Number.isFinite(programWorkoutId) || programWorkoutId <= 0 ||
              !Number.isFinite(workoutId) || workoutId <= 0 ||
              !Number.isFinite(programId) || programId <= 0
            ) {
              return workouts;
            }

            workouts.push({
              userWorkoutId,
              programWorkoutId,
              workoutId,
              programId,
              scheduledAt: item.scheduledAt ?? item.scheduled_at ?? null,
              completed: item.completed ?? null,
              workoutName: item.workoutName ?? item.workout_name ?? null,
            });

            return workouts;
          }, []),
        })),
      );
  }

  /**
   * Workout exercise sorrendjének módosítása.
   */
  updateExerciseOrderIndex(
    workoutId: number,
    exerciseId: number,
    orderIndex: number,
  ): Observable<void> {
    const params = new HttpParams()
      .set('workoutId', workoutId)
      .set('exerciseId', exerciseId)
      .set('orderIndex', orderIndex);

    return this.http.put<void>(API_ENDPOINTS.workoutExerciseOrderIndex, null, { params });
  }
  /**
   * A belépett user számára ütemezett workoutok
   * keresése és lapozása.
   */
  searchScheduledWorkouts(
    search: string,
    page: number = 0,
    size: number = 6,
  ): Observable<ApiResponse<ScheduledWorkoutsSearchResponse>> {
    const params = new HttpParams().set('search', search).set('page', page).set('size', size);

    return this.http.get<ApiResponse<ScheduledWorkoutsSearchResponse>>(API_ENDPOINTS.scheduledUserWorkoutsSearch, { params });
  }
}
