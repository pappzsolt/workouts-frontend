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
  workoutExerciseNotes: string;
  workoutId: number;
  workoutName: string;
  workoutDescription: string;
  workoutDate: string;
  workoutDurationMinutes: number;
  workoutIntensityLevel: string;
  workoutDone: boolean;
  exerciseDone: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserExerciseService {
  private apiUrl = 'http://localhost:8080/api/exercises';

  constructor(private http: HttpClient) {}

  /**
   * Lekéri a megadott workouthoz tartozó exercise-okat.
   * @param workoutId A workout ID-je
   * @returns Observable<ExerciseDto[]>
   */
  getExercisesByWorkout(workoutId: number): Observable<ExerciseDto[]> {
    return this.http.get<ExerciseDto[]>(`${this.apiUrl}/workout/${workoutId}`);
  }
}
