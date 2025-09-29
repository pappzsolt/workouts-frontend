import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Exercise {
  id: number;
  name: string;
  description: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  muscleGroup?: string | null;
  equipment?: string | null;
  difficultyLevel?: string | null;
  category?: string | null;
  caloriesBurnedPerMinute?: number | null;
  durationSeconds?: number | null;
  done?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserExercisesDetailService {

  private apiUrl = 'http://localhost:8080/api/exercises/detail'; // új végpont

  constructor(private http: HttpClient) {}

  // Lekéri az exercise részleteit közvetlenül az exerciseId alapján
  getExerciseById(exerciseId: number): Observable<Exercise> {
    return this.http.get<Exercise>(`${this.apiUrl}/${exerciseId}`);
  }
}
