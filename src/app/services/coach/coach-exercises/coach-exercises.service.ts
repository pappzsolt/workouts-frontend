import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { Exercise, WorkoutDto as WorkoutUiDto } from '../../../models/exercise.model';
import type { WorkoutDto as BackendWorkoutDto } from '../../../models/backend-dto/exercise/workout-dto';
import type { ExerciseDto } from '../../../models/backend-dto/exercise/exercise-dto';
import type { ExerciseRequest } from '../../../models/backend-dto/exercise/exercise-request';
import type { ExerciseResponse } from '../../../models/backend-dto/exercise/exercise-response';
import type { ExerciseSearchResponse as BackendExerciseSearchResponse } from '../../../models/backend-dto/exercise/exercise-search-response';
import type { ApiResponse } from '../../../models/backend-dto/common/api-response';
import { API_ENDPOINTS } from '../../../api-endpoints';
import { LanguageService } from '../../shared/language.service';

@Injectable({
  providedIn: 'root',
})
export class ExerciseService {
  private readonly toExercise = (exercise: ExerciseDto): Exercise => ({
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
  });

  private readonly toWorkoutUiDto = (workout: BackendWorkoutDto): WorkoutUiDto => {
    if (workout.id == null) {
      throw new Error('A workout válaszban hiányzik az azonosító.');
    }

    return {
      id: workout.id,
      name: workout.name ?? '',
      description: workout.description ?? '',
      workoutDate: workout.workoutDate ?? undefined,
      durationMinutes: workout.durationMinutes ?? undefined,
      intensityLevel: workout.intensityLevel ?? undefined,
      done: workout.done ?? undefined,
      exercises: (workout.exercises ?? []).flatMap((item) => {
        if (item.id == null || item.workoutId == null || item.exercise == null || item.exercise.id == null) {
          return [];
        }

        return [{
          id: item.id,
          workoutId: item.workoutId,
          exercise: this.toExercise(item.exercise),
          sets: item.sets ?? 0,
          repetitions: item.repetitions ?? 0,
          orderIndex: item.orderIndex ?? 0,
          restSeconds: item.restSeconds ?? 0,
          notes: item.notes ?? undefined,
          done: item.done ?? false,
        }];
      }),
    };
  };

  private http = inject(HttpClient);
  private languageService = inject(LanguageService);

  // ==========================================================
  // WORKOUTOK EXERCISE-EKKEL
  // ==========================================================

  getWorkoutsWithExercises(): Observable<ApiResponse<WorkoutUiDto[]>> {
    return this.http
      .get<ApiResponse<BackendWorkoutDto[]>>(API_ENDPOINTS.exercisesForWorkouts)
      .pipe(
        map((response) => ({
          ...response,
          data: (response.data ?? [])
            .filter((workout) => workout.id != null)
            .map((workout) => this.toWorkoutUiDto(workout)),
        })),
      );
  }

  // ==========================================================
  // EGY WORKOUT EXERCISE-EKKEL
  // ==========================================================

  getWorkoutExercises(workoutId: number): Observable<WorkoutUiDto> {
    return this.http
      .get<ApiResponse<BackendWorkoutDto>>(API_ENDPOINTS.exerciseForWorkout(workoutId))
      .pipe(
        map((response) => {
          if (response.data == null) {
            throw new Error('A workout válaszban nincs adat.');
          }
          return this.toWorkoutUiDto(response.data);
        }),
      );
  }

  // ==========================================================
  // WORKOUT EXERCISE DONE
  // ==========================================================

  updateWorkoutExerciseDone(
    workoutId: number,
    exerciseId: number,
    done: boolean,
  ): Observable<string> {
    return this.http.patch<string>(API_ENDPOINTS.exerciseDone, {
      workoutId,
      exerciseId,
      done,
    });
  }

  // ==========================================================
  // EXERCISE HOZZÁADÁSA
  // ==========================================================

  addExercise(exercise: Exercise): Observable<ExerciseResponse> {
    const payload: ExerciseRequest = {
      id: exercise.id ?? null,
      name: exercise.name ?? null,
      description: exercise.description ?? null,
      imageUrl: exercise.imageUrl ?? null,
      videoUrl: exercise.videoUrl ?? null,
      muscleGroup: exercise.muscleGroup ?? null,
      equipment: exercise.equipment ?? null,
      difficultyLevel: exercise.difficultyLevel ?? null,
      category: exercise.category ?? null,
      caloriesBurnedPerMinute: exercise.caloriesBurnedPerMinute ?? null,
      durationSeconds: exercise.durationSeconds ?? null,
    };

    return this.http.post<ExerciseResponse>(API_ENDPOINTS.exerciseAdd, payload);
  }

  // ==========================================================
  // EXERCISE MÓDOSÍTÁSA
  // ==========================================================

  updateExercise(
    exercise: Exercise,
    language: string = 'hu',
  ): Observable<ApiResponse<ExerciseDto>> {
    const payload = {
      id: exercise.id,

      // ==========================================================
      // FORDÍTOTT MEZŐK
      // Ezeket az /update endpoint a language alapján
      // az exercise_translations táblában frissíti.
      // ==========================================================
      name: exercise.name,
      description: exercise.description,
      bodyPart: exercise.bodyPart,
      synonyms: exercise.synonyms,
      instructions: exercise.instructions,
      tips: exercise.tips,
      primaryMuscles: exercise.primaryMuscles,
      secondaryMuscles: exercise.secondaryMuscles,

      // ==========================================================
      // KÖZÖS EXERCISE MEZŐK
      // ==========================================================
      imageUrl: exercise.imageUrl,
      videoUrl: exercise.videoUrl,
      muscleGroup: exercise.muscleGroup,
      equipment: exercise.equipment,
      difficultyLevel: exercise.difficultyLevel,
      category: exercise.category,
      caloriesBurnedPerMinute: exercise.caloriesBurnedPerMinute,
      durationSeconds: exercise.durationSeconds,
      done: exercise.done,
      forceType: exercise.forceType,
      mechanic: exercise.mechanic,
      isUnilateral: exercise.isUnilateral,
      isBodyweight: exercise.isBodyweight,
      variationGroup: exercise.variationGroup,
    };

    const params = new HttpParams().set('language', language);

    return this.http.put<ApiResponse<ExerciseDto>>(
      API_ENDPOINTS.exerciseUpdate,
      payload,
      { params },
    );
  }

  // ==========================================================
  // EXERCISE TÖRLÉSE
  // ==========================================================

  deleteExercise(exerciseId: number): Observable<ExerciseResponse> {
    return this.http.delete<ExerciseResponse>(API_ENDPOINTS.exerciseDelete(exerciseId));
  }

  // ==========================================================
  // ÖSSZES GYAKORLAT LEKÉRÉSE
  // ==========================================================

  getAllExercises(language: string = 'hu'): Observable<ApiResponse<Exercise[]>> {
    const params = new HttpParams().set('language', language);

    return this.http
      .get<ApiResponse<ExerciseDto[]>>(API_ENDPOINTS.allExercises, { params })
      .pipe(
        map((response) => ({
          ...response,
          data: (response.data ?? []).map((exercise) => this.toExercise(exercise)),
        })),
      );
  }
  // ==========================================================
  // EXERCISE KERESÉS BACKENDEN
  // ==========================================================

  searchExercises(
    search: string,
    searchField: string = 'all',
    page: number = 0,
    size: number = 6,
    programId?: number,
    workoutId?: number,
    sortDirection: 'asc' | 'desc' = 'asc',
  ): Observable<
    ApiResponse<{
      content: Exercise[];
      page: number;
      size: number;
      totalElements: number;
      totalPages: number;
    }>
  > {
    let params = new HttpParams()
      .set('language', this.languageService.getCurrentLanguage())
      .set('search', search)
      .set('searchField', searchField)
      .set('page', page)
      .set('size', size)
      .set('sortDirection', sortDirection);

    if (programId !== undefined) {
      params = params.set('programId', programId);
    }

    if (workoutId !== undefined) {
      params = params.set('workoutId', workoutId);
    }

    return this.http
      .get<ApiResponse<BackendExerciseSearchResponse>>(API_ENDPOINTS.exerciseSearch, { params })
      .pipe(
        map((response) => ({
          ...response,
          data: response.data
            ? {
                ...response.data,
                content: (response.data.content ?? []).map((exercise) =>
                  this.toExercise(exercise),
                ),
              }
            : null,
        })),
      );
  }
}
