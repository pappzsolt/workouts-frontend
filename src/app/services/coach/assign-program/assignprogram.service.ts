import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../api-endpoints';

export interface ExerciseDto {
  exerciseId: number;
  exerciseName: string;
  exerciseDescription: string;
  sets: number;
  repetitions: number;
  restSeconds: number;
  notes: string;
}

export interface WorkoutDto {
  workoutId: number;
  workoutName: string;
  workoutDescription: string;
  exercises: ExerciseDto[];
}

export interface ProgramDto {
  programId: number;
  programName: string;
  programDescription: string;
  durationDays: number;
  difficultyLevel: string;
  workouts: WorkoutDto[];
}

export interface UserProgramDto {
  programId: number;
  programName: string;
  programDescription: string;
  durationDays: number;
  difficultyLevel: string;
  status: string;
  assignedAt: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
  count?: number;
}

@Injectable({ providedIn: 'root' })
export class AssignProgramService {

  private http = inject(HttpClient);

  // --- GET metódusok ---

  getAllPrograms(): Observable<ApiResponse<ProgramDto[]>> {
    return this.http.get<ApiResponse<ProgramDto[]>>(
      API_ENDPOINTS.allPrograms
    );
  }

  getMyAssignedPrograms(): Observable<ApiResponse<UserProgramDto[]>> {
    return this.http.get<ApiResponse<UserProgramDto[]>>(
      API_ENDPOINTS.assignedPrograms
    );
  }

  // --- POST: program hozzárendelése userhez ---

  assignProgramToUser(
    userId: number,
    programId: number
  ): Observable<ApiResponse<void>> {

    const body = { userId, programId };

    return this.http.post<ApiResponse<void>>(
      API_ENDPOINTS.assignProgram,
      body
    );
  }
}
