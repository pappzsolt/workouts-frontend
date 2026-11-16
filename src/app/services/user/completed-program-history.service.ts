import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../api-endpoints';
import { ApiResponse } from '../../models/backend-dto/common/api-response';

/** Read-only program archive DTOs; the API uses the logged-in account, never a supplied user ID. */
export interface CompletedProgram {
  id: number;
  name: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  totalWorkouts: number;
  completedWorkouts: number;
}

export interface CompletedProgramWorkout {
  userWorkoutId: number;
  workoutId: number;
  workoutName: string | null;
  workoutDate: string | null;
  performedAt: string | null;
  notes: string | null;
  feedback: string | null;
}

@Injectable({ providedIn: 'root' })
export class CompletedProgramHistoryService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = API_ENDPOINTS.completedProgramHistory;

  getCompletedPrograms(language: string): Observable<ApiResponse<CompletedProgram[]>> {
    return this.http.get<ApiResponse<CompletedProgram[]>>(this.endpoint, {
      params: new HttpParams().set('language', language),
    });
  }

  getWorkouts(programId: number, language: string): Observable<ApiResponse<CompletedProgramWorkout[]>> {
    return this.http.get<ApiResponse<CompletedProgramWorkout[]>>(API_ENDPOINTS.completedProgramHistoryWorkouts(programId), {
      params: new HttpParams().set('language', language),
    });
  }
}
