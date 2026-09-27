import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';

import type { WorkoutCopyRequest } from '../../models/backend-dto/workout/workout-copy-request';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';

@Injectable({
  providedIn: 'root',
})
export class WorkoutCopyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_ENDPOINTS.workoutCopy;

  copyWorkout(request: WorkoutCopyRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(this.apiUrl, request);
  }
}
