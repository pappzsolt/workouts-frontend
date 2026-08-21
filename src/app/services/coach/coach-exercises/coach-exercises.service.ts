import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Exercise,
  WorkoutDto
} from '../../../models/exercise.model';

import { API_ENDPOINTS } from '../../../api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class ExerciseService {

  private http = inject(HttpClient);

  getWorkoutsWithExercises(): Observable<WorkoutDto[]> {
    return this.http.get<WorkoutDto[]>(
      `${API_ENDPOINTS.exercises}/workouts`
    );
  }

  getWorkoutExercises(workoutId: number): Observable<WorkoutDto> {
    return this.http.get<WorkoutDto>(
      `${API_ENDPOINTS.exercises}/workout/${workoutId}`
    );
  }

  updateWorkoutExerciseDone(
    workoutId: number,
    exerciseId: number,
    done: boolean
  ): Observable<string> {
    return this.http.patch<string>(
      `${API_ENDPOINTS.exercises}/done`,
      { workoutId, exerciseId, done }
    );
  }

  addExercise(exercise: Exercise): Observable<Exercise> {
    return this.http.post<Exercise>(
      `${API_ENDPOINTS.exercises}/add`,
      exercise
    );
  }

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
      durationSeconds: exercise.durationSeconds
    };

    return this.http.put<Exercise>(
      `${API_ENDPOINTS.exercises}/update`,
      payload
    );
  }

  deleteExercise(exerciseId: number): Observable<string> {
    return this.http.delete<string>(
      `${API_ENDPOINTS.exercises}/delete/${exerciseId}`
    );
  }

  getAllExercises(): Observable<Exercise[]> {
    return this.http.get<Exercise[]>(
      `${API_ENDPOINTS.exercises}/all`
    );
  }
}
