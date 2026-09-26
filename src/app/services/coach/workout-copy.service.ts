import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';

import type { WorkoutCopyRequest } from '../../models/backend-dto/workout/workout-copy-request';
import type { WorkoutCopyResponse } from '../../models/backend-dto/workout/workout-copy-response';

@Injectable({
  providedIn: 'root',
})
export class WorkoutCopyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_ENDPOINTS.workoutCopy;

  copyWorkout(request: WorkoutCopyRequest): Observable<WorkoutCopyResponse> {
    return this.http.post<WorkoutCopyResponse>(this.apiUrl, request);
  }
}
