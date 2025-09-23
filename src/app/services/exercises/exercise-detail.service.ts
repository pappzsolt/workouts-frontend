import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export interface ExerciseDetail {
  id: number;
  name: string;
  description: string;
  image_url?: string;
  video_url?: string;
  muscle_group?: string;
  equipment?: string;
  difficulty_level?: string;
  category?: string;
  calories_burned_per_minute?: number;
  duration_seconds?: number;

  done?: boolean; // ← hozzáadva
}


@Injectable({
  providedIn: 'root'
})
export class ExerciseDetailService {
  constructor(private http: HttpClient) {}

  getExerciseById(id: number): Observable<ExerciseDetail> {
    // ha van API:
    // return this.http.get<ExerciseDetail>(`/api/exercises/${id}`);
    // tesztadat:
    return of({
      id,
      name: `Exercise ${id}`,
      description: 'Részletes leírás',
      muscle_group: 'Chest',
      difficulty_level: 'Medium'
    });
  }

  updateExercise(id: number, data: ExerciseDetail): Observable<ExerciseDetail> {
    // return this.http.put<ExerciseDetail>(`/api/exercises/${id}`, data);
    return of(data);
  }
}
