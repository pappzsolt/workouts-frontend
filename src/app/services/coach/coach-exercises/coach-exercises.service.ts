import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Exercise ,WorkoutDto } from '../../../models/exercise.model';

@Injectable({
  providedIn: 'root'
})
export class ExerciseService {

  private baseUrl = 'http://localhost:8080/api/exercises';
  private exercisesUrl = 'http://localhost:8080/api/exercises';

  constructor(private http: HttpClient) {}

  // Lekérdezi az összes workoutot a belépett coach-hoz tartozó exercise-ekkel
  getWorkoutsWithExercises(): Observable<WorkoutDto[]> {
    return this.http.get<WorkoutDto[]>(`${this.baseUrl}/workouts`);
  }

  // Lekérdezi egy adott workout exercise-eit
  getWorkoutExercises(workoutId: number): Observable<WorkoutDto> {
    return this.http.get<WorkoutDto>(`${this.baseUrl}/workout/${workoutId}`);
  }

  // Frissíti a workout_exercises.done mezőt
  updateWorkoutExerciseDone(workoutId: number, exerciseId: number, done: boolean): Observable<string> {
    return this.http.patch<string>(`${this.baseUrl}/done`, { workoutId, exerciseId, done });
  }

  // Új exercise felvitele
  addExercise(exercise: Exercise): Observable<Exercise> {
    return this.http.post<Exercise>(`${this.baseUrl}/add`, exercise);
  }

  // Exercise frissítése
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
    return this.http.put<Exercise>(`${this.baseUrl}/update`, payload);
  }

  // Exercise törlése
  deleteExercise(exerciseId: number): Observable<string> {
    return this.http.delete<string>(`${this.baseUrl}/delete/${exerciseId}`);
  }

  // 🔹 Lekéri az összes exercise-t ABC sorrendben
  getAllExercises(): Observable<Exercise[]> {
    return this.http.get<Exercise[]>(`${this.exercisesUrl}/all`);
  }
}
