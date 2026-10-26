import type { ScheduledWorkout } from '../../models/scheduled-workout/scheduled-workout.model';
import type { ScheduledWorkoutRecord } from '../../models/scheduled-workout/scheduled-workout-record.model';
import type { UserProgramExerciseRow } from '../../models/user-program/user-program-exercise-row.model';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { PageResponse } from '../../models/backend-dto/common/page-response';
import { UserWorkoutExerciseDto } from '../../models/user-workout-exercise.dto';

import { API_ENDPOINTS } from '../../api-endpoints';
import { LanguageService } from '../shared/language.service';

@Injectable({
  providedIn: 'root',
})
export class WorkoutExercisesManagerService {
  private readonly http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);

  /**
   * Lekéri egy user workout összes exercise-át.
   */
  getExercisesForUserWorkout(userWorkoutId: number): Observable<UserWorkoutExerciseDto[]> {
    return this.http
      .get<ApiResponse<UserWorkoutExerciseDto[]>>(
        API_ENDPOINTS.userWorkoutExerciseByWorkout(userWorkoutId),
        {
          params: {
            language: this.languageService.getCurrentLanguage(),
          },
        },
      )
      .pipe(map((response: ApiResponse<UserWorkoutExerciseDto[]>) => response.data ?? []));
  }

  /**
   * Teljes program + workout + exercise + user adatok lekérése.
   */
  getUserProgramWithExercises(userId: number, programId: number): Observable<ApiResponse<UserProgramExerciseRow[]>> {
    return this.http.get<ApiResponse<UserProgramExerciseRow[]>>(
      API_ENDPOINTS.userWorkoutExercisesByUserProgram(userId, programId),
      {
        params: {
          language: this.languageService.getCurrentLanguage(),
        },
      },
    );
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
      .get<ApiResponse<ScheduledWorkoutRecord[]>>(
        API_ENDPOINTS.scheduledUserWorkouts,
        {
          params: {
            language: this.languageService.getCurrentLanguage(),
          },
        },
      )
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
   * A belépett user számára ütemezett workoutok
   * keresése és lapozása.
   */
  searchScheduledWorkouts(
    search: string,
    page: number = 0,
    size: number = 6,
  ): Observable<ApiResponse<PageResponse<ScheduledWorkoutRecord>>> {
    const params = new HttpParams()
      .set('language', this.languageService.getCurrentLanguage())
      .set('search', search)
      .set('page', page)
      .set('size', size);

    return this.http.get<ApiResponse<PageResponse<ScheduledWorkoutRecord>>>(API_ENDPOINTS.scheduledUserWorkoutsSearch, { params });
  }
}
