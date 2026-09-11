import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Exercise, WorkoutDto } from '../../../models/exercise.model';
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

  updateExercise(exercise: Exercise): Observable<Exercise> {
    const payload = {
      id: exercise.id,
      name: exercise.name,
      description: exercise.description,
      imageUrl: exercise.imageUrl,
      videoUrl: exercise.videoUrl,
      muscleGroup: exercise.muscleGroup,
      equipment: exercise.equipment,
      difficultyLevel: exercise.difficultyLevel,
      category: exercise.category,
      caloriesBurnedPerMinute: exercise.caloriesBurnedPerMinute,
      durationSeconds: exercise.durationSeconds,
    };

    return this.http.put<Exercise>(`${API_ENDPOINTS.exercises}/update`, payload);
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

  getAllExercises(): Observable<ApiResponse<Exercise[]>> {
    return this.http.get<ApiResponse<Exercise[]>>(`${API_ENDPOINTS.exercises}/all`);
  }
}
