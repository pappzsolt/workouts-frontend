import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { PagedWorkoutResponse, Workout } from '../../../models/workout.model';
import type { WorkoutDto as WorkoutUiDto } from '../../../models/exercise.model';
import type { WorkoutDto } from '../../../models/backend-dto/exercise/workout-dto';
import type { WorkoutRequest } from '../../../models/backend-dto/workout/workout-request';
import type { WorkoutResponse } from '../../../models/backend-dto/workout/workout-response';
import type { ApiResponse } from '../../../models/backend-dto/common/api-response';

import { API_ENDPOINTS } from '../../../api-endpoints';

@Injectable({
  providedIn: 'root',
})
export class CoachWorkoutsService {
  private readonly http = inject(HttpClient);

  private readonly toWorkoutUiDto = (workout: WorkoutDto): WorkoutUiDto => ({
    id: workout.id ?? 0,
    name: workout.name ?? '',
    description: workout.description ?? '',
    workoutDate: workout.workoutDate ?? undefined,
    durationMinutes: workout.durationMinutes ?? undefined,
    intensityLevel: workout.intensityLevel ?? undefined,
    done: workout.done ?? undefined,
    exercises: (workout.exercises ?? [])
      .filter((item) => item.id != null && item.workoutId != null && item.exercise != null)
      .map((item) => ({
        id: item.id!,
        workoutId: item.workoutId!,
        exercise: {
          id: item.exercise!.id ?? undefined,
          name: item.exercise!.name ?? '',
          description: item.exercise!.description ?? undefined,
          bodyPart: item.exercise!.bodyPart ?? undefined,
          synonyms: item.exercise!.synonyms ?? undefined,
          instructions: item.exercise!.instructions ?? undefined,
          tips: item.exercise!.tips ?? undefined,
          primaryMuscles: item.exercise!.primaryMuscles ?? undefined,
          secondaryMuscles: item.exercise!.secondaryMuscles ?? undefined,
          imageUrl: item.exercise!.imageUrl ?? undefined,
          videoUrl: item.exercise!.videoUrl ?? undefined,
          muscleGroup: item.exercise!.muscleGroup ?? undefined,
          equipment: item.exercise!.equipment ?? undefined,
          difficultyLevel: item.exercise!.difficultyLevel ?? undefined,
          category: item.exercise!.category ?? undefined,
          caloriesBurnedPerMinute: item.exercise!.caloriesBurnedPerMinute ?? undefined,
          durationSeconds: item.exercise!.durationSeconds ?? undefined,
          done: item.exercise!.done ?? undefined,
          forceType: item.exercise!.forceType ?? undefined,
          mechanic: item.exercise!.mechanic ?? undefined,
          isUnilateral: item.exercise!.isUnilateral ?? undefined,
          isBodyweight: item.exercise!.isBodyweight ?? undefined,
          variationGroup: item.exercise!.variationGroup ?? undefined,
        },
        sets: item.sets ?? 0,
        repetitions: item.repetitions ?? 0,
        orderIndex: item.orderIndex ?? 0,
        restSeconds: item.restSeconds ?? 0,
        notes: item.notes ?? undefined,
        done: item.done ?? false,
      })),
  });

  private readonly toWorkout = (workout: WorkoutDto): Workout => ({
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
      .get<ApiResponse<WorkoutDto[]>>(API_ENDPOINTS.myWorkouts)
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
      .get<WorkoutDto[]>(API_ENDPOINTS.uniqueMyWorkouts)
      .pipe(map((workouts) => workouts.map((workout) => this.toWorkout(workout))));
  }

  /**
   * Egyedi workoutok exercise-okkal.
   *
   * GET /api/exercises/workouts/unique
   */
  getUniqueWorkoutsWithExercises(): Observable<ApiResponse<WorkoutUiDto[]>> {
    return this.http
      .get<ApiResponse<WorkoutDto[]>>(API_ENDPOINTS.uniqueWorkoutsWithExercises)
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
      workoutName: workout.workoutName ?? workout.name ?? null,
      workoutDescription: workout.workoutDescription ?? workout.description ?? null,
      workoutDate: workout.workoutDate ?? null,
      durationMinutes: workout.durationMinutes ?? null,
      intensityLevel: workout.intensityLevel ?? null,
      dayIndex: workout.dayIndex ?? null,
      done: workout.done ?? null,
    };

    return this.http.post<WorkoutResponse>(API_ENDPOINTS.workoutAdd, payload);
  }

  /**
   * Workout lekérése ID alapján.
   */
  getWorkoutById(id: number): Observable<ApiResponse<WorkoutDto>> {
    return this.http.get<ApiResponse<WorkoutDto>>(API_ENDPOINTS.workoutById(id));
  }

  /**
   * Workout módosítása.
   */
  updateWorkout(id: number, workout: Workout): Observable<WorkoutResponse> {
    const payload: WorkoutRequest = {
      id,
      workoutName: workout.workoutName ?? workout.name ?? null,
      workoutDescription: workout.workoutDescription ?? workout.description ?? null,
      workoutDate: workout.workoutDate ?? null,
      durationMinutes: workout.durationMinutes ?? null,
      intensityLevel: workout.intensityLevel ?? null,
      dayIndex: workout.dayIndex ?? null,
      done: workout.done ?? null,
    };

    return this.http.put<WorkoutResponse>(API_ENDPOINTS.workoutUpdate, payload);
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
    language: string = 'hu',
    sortDirection: 'asc' | 'desc' = 'asc',
  ): Observable<PagedWorkoutResponse> {
    const params = new HttpParams()
      .set('search', search)
      .set('page', page)
      .set('size', size)
      .set('language', language)
      .set('sortDirection', sortDirection);

    return this.http.get<PagedWorkoutResponse>(API_ENDPOINTS.myWorkoutsSearch, { params });
  }
}
