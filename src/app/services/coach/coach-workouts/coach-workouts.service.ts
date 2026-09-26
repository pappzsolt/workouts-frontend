import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import type { Workout } from '../../../models/workout.model';
import type { WorkoutWithExercises as WorkoutUiDto } from '../../../models/exercise.model';
import type { WorkoutDto as BackendWorkoutDto } from '../../../models/backend-dto/exercise/workout-dto';
import type { UserWorkoutDto } from '../../../models/backend-dto/workout/user-workout-dto';
import type { WorkoutRequest } from '../../../models/backend-dto/workout/workout-request';
import type { WorkoutResponse } from '../../../models/backend-dto/workout/workout-response';
import type { ApiResponse } from '../../../models/backend-dto/common/api-response';
import type { PageResponse } from '../../../models/backend-dto/common/page-response';
import { LanguageService } from '../../shared/language.service';

import { API_ENDPOINTS } from '../../../api-endpoints';

@Injectable({
  providedIn: 'root',
})
export class CoachWorkoutsService {
  private readonly http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);

  private readonly toWorkoutUiDto = (workout: BackendWorkoutDto): WorkoutUiDto => ({
    id: workout.id ?? 0,
    name: workout.name ?? '',
    description: workout.description ?? '',
    workoutDate: workout.workoutDate ?? undefined,
    durationMinutes: workout.durationMinutes ?? undefined,
    intensityLevel: workout.intensityLevel ?? undefined,
    done: workout.done ?? undefined,
    exercises: (workout.exercises ?? [])
      .filter(
        (
          item,
        ): item is NonNullable<BackendWorkoutDto['exercises']>[number] & {
          id: number;
          workoutId: number;
          exercise: NonNullable<
            NonNullable<BackendWorkoutDto['exercises']>[number]['exercise']
          >;
        } =>
          item.id != null &&
          item.workoutId != null &&
          item.exercise != null,
      )
      .map((item) => {
        const exercise = item.exercise;

        return {
          id: item.id,
          workoutId: item.workoutId,
          exercise: {
            id: exercise.id ?? undefined,
            name: exercise.name ?? '',
            description: exercise.description ?? undefined,
            bodyPart: exercise.bodyPart ?? undefined,
            synonyms: exercise.synonyms ?? undefined,
            instructions: exercise.instructions ?? undefined,
            tips: exercise.tips ?? undefined,
            primaryMuscles: exercise.primaryMuscles ?? undefined,
            secondaryMuscles: exercise.secondaryMuscles ?? undefined,
            imageUrl: exercise.imageUrl ?? undefined,
            videoUrl: exercise.videoUrl ?? undefined,
            muscleGroup: exercise.muscleGroup ?? undefined,
            equipment: exercise.equipment ?? undefined,
            difficultyLevel: exercise.difficultyLevel ?? undefined,
            category: exercise.category ?? undefined,
            caloriesBurnedPerMinute: exercise.caloriesBurnedPerMinute ?? undefined,
            durationSeconds: exercise.durationSeconds ?? undefined,
            done: exercise.done ?? undefined,
            forceType: exercise.forceType ?? undefined,
            mechanic: exercise.mechanic ?? undefined,
            isUnilateral: exercise.isUnilateral ?? undefined,
            isBodyweight: exercise.isBodyweight ?? undefined,
            variationGroup: exercise.variationGroup ?? undefined,
          },
          sets: item.sets ?? 0,
          repetitions: item.repetitions ?? 0,
          orderIndex: item.orderIndex ?? 0,
          restSeconds: item.restSeconds ?? 0,
          notes: item.notes ?? undefined,
          done: item.done ?? false,
        };
      }),
  });

  private readonly toWorkout = (workout: BackendWorkoutDto): Workout => ({
    id: workout.id ?? undefined,
    workoutName: workout.name ?? undefined,
    name: workout.name ?? undefined,
    description: workout.description ?? undefined,
    workoutDescription: workout.description ?? undefined,
    workoutDate: workout.workoutDate ?? undefined,
    durationMinutes: workout.durationMinutes ?? undefined,
    intensityLevel: workout.intensityLevel ?? undefined,
    done: workout.done ?? undefined,
    exercises: [],
  });

  private readonly apiUrl = API_ENDPOINTS.workouts;

  /**
   * A bejelentkezett coach által létrehozott
   * összes workout lekérése.
   *
   * GET /api/workouts/my-workouts
   */
  getMyWorkouts(): Observable<ApiResponse<Workout[]>> {
    return this.http
      .get<ApiResponse<BackendWorkoutDto[]>>(API_ENDPOINTS.myWorkouts)
      .pipe(
        map((response) => ({
          ...response,
          data: (response.data ?? []).map((workout) => this.toWorkout(workout)),
        })),
      );
  }

  /**
   * A bejelentkezett coach egyedi workoutjainak lekérése.
   *
   * GET /api/workouts/my-workouts/unique
   */
  getUniqueMyWorkouts(): Observable<Workout[]> {
    return this.http
      .get<BackendWorkoutDto[]>(API_ENDPOINTS.uniqueMyWorkouts)
      .pipe(map((workouts) => workouts.map((workout) => this.toWorkout(workout))));
  }

  /**
   * Egyedi workoutok exercise-okkal.
   *
   * GET /api/exercises/workouts/unique
   */
  getUniqueWorkoutsWithExercises(): Observable<ApiResponse<WorkoutUiDto[]>> {
    return this.http
      .get<ApiResponse<BackendWorkoutDto[]>>(API_ENDPOINTS.uniqueWorkoutsWithExercises)
      .pipe(
        map((response) => ({
          ...response,
          data: (response.data ?? []).map((workout) => this.toWorkoutUiDto(workout)),
        })),
      );
  }

  /**
   * Új workout létrehozása.
   */
  addWorkout(workout: Workout): Observable<WorkoutResponse> {
    const payload: WorkoutRequest = {
      id: workout.id ?? null,
      name: workout.name ?? workout.workoutName ?? null,
      description: workout.description ?? workout.workoutDescription ?? null,
      workoutDate: workout.workoutDate ?? null,
      durationMinutes: workout.durationMinutes ?? null,
      intensityLevel: workout.intensityLevel ?? null,
      dayIndex: workout.dayIndex ?? null,
      done: workout.done ?? null,
    };

    const params = new HttpParams().set(
      'language',
      this.languageService.getCurrentLanguage(),
    );

    return this.http.post<WorkoutResponse>(
      API_ENDPOINTS.workoutAdd,
      payload,
      { params },
    );
  }

  /**
   * Workout lekérése ID alapján.
   */
  getWorkoutById(id: number): Observable<ApiResponse<UserWorkoutDto>> {
    const params = new HttpParams().set(
      'language',
      this.languageService.getCurrentLanguage(),
    );

    return this.http.get<ApiResponse<UserWorkoutDto>>(
      API_ENDPOINTS.workoutById(id),
      { params },
    );
  }

  /**
   * Workout módosítása.
   */
  updateWorkout(id: number, workout: Workout): Observable<WorkoutResponse> {
    const payload: WorkoutRequest = {
      id,
      name: workout.name ?? workout.workoutName ?? null,
      description: workout.description ?? workout.workoutDescription ?? null,
      workoutDate: workout.workoutDate ?? null,
      durationMinutes: workout.durationMinutes ?? null,
      intensityLevel: workout.intensityLevel ?? null,
      dayIndex: workout.dayIndex ?? null,
      done: workout.done ?? null,
    };

    const params = new HttpParams().set(
      'language',
      this.languageService.getCurrentLanguage(),
    );

    return this.http.put<WorkoutResponse>(
      API_ENDPOINTS.workoutUpdate,
      payload,
      { params },
    );
  }

  /**
   * Workout törlése.
   */
  deleteWorkout(id: number): Observable<WorkoutResponse> {
    return this.http.delete<WorkoutResponse>(API_ENDPOINTS.workoutDelete(id));
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
  ): Observable<PageResponse<Workout>> {
    const params = new HttpParams()
      .set('search', search)
      .set('page', page)
      .set('size', size)
      .set('language', language ?? this.languageService.getCurrentLanguage())
      .set('sortDirection', sortDirection);

    return this.http.get<PageResponse<Workout>>(API_ENDPOINTS.myWorkoutsSearch, { params });
  }
}
