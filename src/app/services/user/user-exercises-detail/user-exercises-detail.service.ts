import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ExerciseDto {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  videoUrl: string | null;
  muscleGroup: string;
  equipment: string;
  difficultyLevel: string;
  category: string;
  caloriesBurnedPerMinute: number | null;
  durationSeconds: number;
}

export interface WorkoutExerciseDto {
  id: number;           // workout_exercise ID
  workoutId: number;
  exercise: ExerciseDto; // belső exercise adatai
  sets: number;
  repetitions: number;
  orderIndex: number;
  restSeconds: number;
  notes: string | null;
  done: boolean;        // workout_exercise done
}

export interface WorkoutDto {
  id: number;
  name: string | null;
  description: string | null;
  workoutDate: string | null;
  durationMinutes: number | null;
  intensityLevel: string | null;
  done: boolean | null;
  exercises: WorkoutExerciseDto[]; // <-- itt a fix
}

export interface ExerciseResponse {
  success: boolean;
  message: string;
  exerciseId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserExerciseDetailService {
  private apiUrl = 'http://localhost:8080/api/exercises';

  constructor(private http: HttpClient) {}

  /** 🔹 Lekérdezi a felhasználó adott workout-jának összes exercise-ét */
  getWorkoutExercises(workoutId: number): Observable<WorkoutDto> {
    return this.http.get<WorkoutDto>(`${this.apiUrl}/my-workout/${workoutId}`);
  }

  /** 🔹 Frissíti egy exercise done státuszát */
  updateExerciseDone(workoutId: number, exerciseId: number, done: boolean): Observable<ExerciseResponse> {
    const body = { workoutId, exerciseId, done };
    return this.http.patch<ExerciseResponse>(`${this.apiUrl}/done`, body);
  }
}
