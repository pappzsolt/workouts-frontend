import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { Exercise, WorkoutDto, ExerciseSearchResponse } from '../../../models/exercise.model';

import { ApiResponse } from '../../../models/api-response.model';
import { API_ENDPOINTS } from '../../../api-endpoints';

@Injectable({
  providedIn: 'root',
})
export class ExerciseService {
  private http = inject(HttpClient);

  // ==========================================================
  // WORKOUTOK EXERCISE-EKKEL
  // ==========================================================

  getWorkoutsWithExercises(): Observable<ApiResponse<WorkoutDto[]>> {
    return this.http.get<ApiResponse<WorkoutDto[]>>(`${API_ENDPOINTS.exercises}/workouts`);
  }

  // ==========================================================
  // EGY WORKOUT EXERCISE-EKKEL
  // ==========================================================

  getWorkoutExercises(workoutId: number): Observable<WorkoutDto> {
    return this.http
      .get<ApiResponse<WorkoutDto>>(`${API_ENDPOINTS.exercises}/workout/${workoutId}`)
      .pipe(map((response: ApiResponse<WorkoutDto>) => response.data));
  }

  // ==========================================================
  // WORKOUT EXERCISE DONE
  // ==========================================================

  updateWorkoutExerciseDone(
    workoutId: number,
    exerciseId: number,
    done: boolean,
  ): Observable<string> {
    return this.http.patch<string>(`${API_ENDPOINTS.exercises}/done`, {
      workoutId,
      exerciseId,
      done,
    });
  }

  // ==========================================================
  // EXERCISE HOZZÁADÁSA
  // ==========================================================

  addExercise(exercise: Exercise): Observable<Exercise> {
    return this.http.post<Exercise>(`${API_ENDPOINTS.exercises}/add`, exercise);
  }

  // ==========================================================
  // EXERCISE MÓDOSÍTÁSA
  // ==========================================================

  updateExercise(
    exercise: Exercise,
    language: string = 'hu',
  ): Observable<ApiResponse<Exercise>> {
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

    return this.http.put<ApiResponse<Exercise>>(
      `${API_ENDPOINTS.exercises}/update`,
      payload,
      { params },
    );
  }

  // ==========================================================
  // EXERCISE TÖRLÉSE
  // ==========================================================

  deleteExercise(exerciseId: number): Observable<string> {
    return this.http.delete<string>(`${API_ENDPOINTS.exercises}/delete/${exerciseId}`);
  }

  // ==========================================================
  // ÖSSZES GYAKORLAT LEKÉRÉSE
  // ==========================================================

  getAllExercises(language: string = 'hu'): Observable<ApiResponse<Exercise[]>> {
    const params = new HttpParams().set('language', language);

    return this.http.get<ApiResponse<Exercise[]>>(`${API_ENDPOINTS.exercises}/all`, { params });
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
  ): Observable<ApiResponse<ExerciseSearchResponse>> {
    let params = new HttpParams()
      .set('language', 'hu')
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

    return this.http.get<ApiResponse<ExerciseSearchResponse>>(
      `${API_ENDPOINTS.exercises}/exercise-search`,
      { params },
    );
  }
}
