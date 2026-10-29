import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import type { WorkoutForm } from '../../../models/workout/workout-form.model';
import type { WorkoutCatalogItem } from '../../../models/workout/workout-catalog-item.model';
import type { WorkoutWithExercises as WorkoutUiDto } from '../../../models/exercise.model';
import type { WorkoutDto as BackendWorkoutDto } from '../../../models/backend-dto/exercise/workout-dto';
import type { UserWorkoutDto } from '../../../models/backend-dto/workout/user-workout-dto';
import type { WorkoutResponse } from '../../../models/backend-dto/workout/workout-response';
import type { ApiResponse } from '../../../models/backend-dto/common/api-response';
import type { PageResponse } from '../../../models/backend-dto/common/page-response';
import { LanguageService } from '../../shared/language.service';
import { toWorkoutCatalogItem, toWorkoutRequest, toWorkoutWithExercises } from '../../shared/workout-mapping';

import { API_ENDPOINTS } from '../../../api-endpoints';

@Injectable({
  providedIn: 'root',
})
export class CoachWorkoutsService {
  private readonly http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);

  private readonly apiUrl = API_ENDPOINTS.workouts;

  /**
   * A bejelentkezett coach által létrehozott
   * összes workout lekérése.
   *
   * GET /api/workouts/my-workouts
   */
  getMyWorkouts(): Observable<ApiResponse<WorkoutCatalogItem[]>> {
    const params = new HttpParams().set(
      'language',
      this.languageService.getCurrentLanguage(),
    );

    return this.http
      .get<ApiResponse<BackendWorkoutDto[]>>(API_ENDPOINTS.myWorkouts, { params })
      .pipe(
        map((response) => ({
          ...response,
          data: (response.data ?? []).map((workout) => toWorkoutCatalogItem(workout)),
        })),
      );
  }

  /**
   * A bejelentkezett coach egyedi workoutjainak lekérése.
   *
   * GET /api/workouts/my-workouts/unique
   */
  getUniqueMyWorkouts(): Observable<ApiResponse<WorkoutCatalogItem[]>> {
    const params = new HttpParams().set(
      'language',
      this.languageService.getCurrentLanguage(),
    );

    return this.http
      .get<ApiResponse<BackendWorkoutDto[]>>(API_ENDPOINTS.uniqueMyWorkouts, { params })
      .pipe(
        map((response) => ({
          ...response,
          data: (response.data ?? []).map((workout) => toWorkoutCatalogItem(workout)),
        })),
      );
  }

  /**
   * Egyedi workoutok exercise-okkal.
   *
   * GET /api/exercises/workouts/unique
   */
  getUniqueWorkoutsWithExercises(): Observable<ApiResponse<WorkoutUiDto[]>> {
    const params = new HttpParams().set(
      'language',
      this.languageService.getCurrentLanguage(),
    );

    return this.http
      .get<ApiResponse<BackendWorkoutDto[]>>(
        API_ENDPOINTS.uniqueWorkoutsWithExercises,
        { params },
      )
      .pipe(
        map((response) => ({
          ...response,
          data: (response.data ?? []).map((workout) => toWorkoutWithExercises(workout)),
        })),
      );
  }

  /**
   * Az edzéstár egy oldala: a backend lapoz, keres (név) és rendez.
   * A page itt 1-től indul, a backend felé 0-tól.
   *
   * GET /api/exercises/workouts/page
   */
  getWorkoutLibraryPage(
    page: number,
    size: number,
    search: string,
    sort: WorkoutLibrarySort,
  ): Observable<WorkoutLibraryPage> {
    const params = new HttpParams()
      .set('language', this.languageService.getCurrentLanguage())
      .set('page', Math.max(0, page - 1))
      .set('size', size)
      .set('search', search.trim())
      .set('sort', sort);

    return this.http
      .get<ApiResponse<PageResponse<BackendWorkoutDto>>>(API_ENDPOINTS.workoutLibraryPage, { params })
      .pipe(
        map((response) => {
          const data = response.data;
          return {
            items: (data?.content ?? []).map((workout) => toWorkoutWithExercises(workout)),
            totalElements: data?.totalElements ?? 0,
            totalPages: data?.totalPages ?? 1,
          };
        }),
      );
  }

  /**
   * Új workout létrehozása.
   */
  addWorkout(workout: WorkoutForm): Observable<ApiResponse<WorkoutResponse>> {
    const payload = toWorkoutRequest(workout);

    const params = new HttpParams().set(
      'language',
      this.languageService.getCurrentLanguage(),
    );

    return this.http.post<ApiResponse<WorkoutResponse>>(
      API_ENDPOINTS.workoutAdd,
      payload,
      { params },
    );
  }

  /**
   * Workout lekérése ID alapján.
   */
  getWorkoutById(id: number, language = this.languageService.getCurrentLanguage()): Observable<ApiResponse<UserWorkoutDto>> {
    const params = new HttpParams().set(
      'language',
      language,
    );

    return this.http.get<ApiResponse<UserWorkoutDto>>(
      API_ENDPOINTS.workoutById(id),
      { params },
    );
  }

  /**
   * Workout módosítása.
   */
  updateWorkout(id: number, workout: WorkoutForm, language = this.languageService.getCurrentLanguage()): Observable<ApiResponse<WorkoutResponse>> {
    const payload = toWorkoutRequest(workout, id);

    const params = new HttpParams().set(
      'language',
      language,
    );

    return this.http.put<ApiResponse<WorkoutResponse>>(
      API_ENDPOINTS.workoutUpdate(id),
      payload,
      { params },
    );
  }

  /**
   * Workout törlése.
   */
  deleteWorkout(id: number): Observable<ApiResponse<WorkoutResponse>> {
    return this.http.delete<ApiResponse<WorkoutResponse>>(API_ENDPOINTS.workoutDelete(id));
  }

  /**
   * A bejelentkezett coach workoutjainak keresése és lapozása.
   *
   * GET /api/workouts/my-workouts/search
   */
  searchMyWorkouts(
    search: string,
    page: number = 0,
    size: number = 6,
    language?: string,
    sortDirection: 'asc' | 'desc' = 'asc',
  ): Observable<PageResponse<WorkoutCatalogItem>> {
    const params = new HttpParams()
      .set('search', search)
      .set('page', page)
      .set('size', size)
      .set('language', language ?? this.languageService.getCurrentLanguage())
      .set('sortDirection', sortDirection);

    return this.http.get<PageResponse<WorkoutCatalogItem>>(API_ENDPOINTS.myWorkoutsSearch, { params });
  }
}

export type WorkoutLibrarySort = 'newest' | 'nameAsc' | 'nameDesc';

export interface WorkoutLibraryPage {
  items: WorkoutUiDto[];
  totalElements: number;
  totalPages: number;
}
