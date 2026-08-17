import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  UserWorkoutDetailDto
} from '../../../models/user-workout-exercise-detail.dto';

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

  getWorkoutExercises(
    workoutId: number
  ): Observable<UserWorkoutDetailDto> {
    return this.http.get<UserWorkoutDetailDto>(
      `${this.apiUrl}/my-workout/${workoutId}`
    );
  }

  updateExerciseDone(
    workoutId: number,
    exerciseId: number,
    done: boolean
  ): Observable<ExerciseResponse> {

    const body = {
      workoutId,
      exerciseId,
      done
    };

    return this.http.patch<ExerciseResponse>(
      `${this.apiUrl}/done`,
      body
    );
  }
}
