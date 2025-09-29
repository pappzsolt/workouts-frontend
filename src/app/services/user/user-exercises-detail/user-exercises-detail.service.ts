import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Exercise {
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
  done: boolean;
}

export interface ExerciseResponse {
  success: boolean;
  message: string;
  exerciseId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserExercisesDetailService {
  private apiUrl = 'http://localhost:8080/api/exercises';

  constructor(private http: HttpClient) {}

  getExerciseById(exerciseId: number): Observable<Exercise> {
    return this.http.get<Exercise>(`${this.apiUrl}/detail/${exerciseId}`);
  }

  // 🔹 Új updateExerciseDone metódus JSON body-val
  updateExerciseDone(workoutId: number, exerciseId: number, done: boolean): Observable<ExerciseResponse> {
    const body = { workoutId, exerciseId, done };
    return this.http.patch<ExerciseResponse>(`${this.apiUrl}/done`, body);
  }
}
