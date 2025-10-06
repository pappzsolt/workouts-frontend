import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Exercise {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  muscleGroup?: string;
  equipment?: string;
  difficultyLevel?: string;
  category?: string;
  caloriesBurnedPerMinute?: number;
  durationSeconds?: number;
}

export interface WorkoutExercise {
  id: number;
  workoutId: number;
  exercise: Exercise;
  sets: number;
  repetitions: number;
  orderIndex: number;
  restSeconds: number;
  notes?: string;
  done: boolean;
}

export interface WorkoutDto {
  id: number;
  name: string;
  description: string;
  workoutDate?: string;
  durationMinutes?: number;
  intensityLevel?: string;
  done?: boolean;
  exercises: WorkoutExercise[];
}

@Injectable({
  providedIn: 'root'
})
export class ExerciseService {

  // Javított base URL
  private baseUrl = 'http://localhost:8080/api/exercises';

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
}
