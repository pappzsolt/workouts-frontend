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
  sets: number;
  repetitions: number;
  orderIndex: number;
  restSeconds: number;
  notes: string | null;
  done: boolean;
}

export interface WorkoutExerciseDto {
  id: number;
  workoutId: number;
  exercise: ExerciseDto;
  sets: number;
  repetitions: number;
  orderIndex: number;
  restSeconds: number;
  notes: string | null;
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
  exercises: WorkoutExerciseDto[];
}

@Injectable({
  providedIn: 'root'
})
export class UserExerciseService {
  private apiUrl = 'http://localhost:8080/api/exercises';

  constructor(private http: HttpClient) {}

  /**
   * Lekéri a belépett user adott workout-hoz tartozó exercise-ait
   * @param workoutId A workout ID-je
   * @returns Observable<WorkoutDto>
   */
  getWorkoutExercises(workoutId: number): Observable<WorkoutDto> {
    return this.http.get<WorkoutDto>(`${this.apiUrl}/my-workout/${workoutId}`);
  }
}
