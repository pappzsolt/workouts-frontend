import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';

import { WorkoutCopyRequest, WorkoutCopyResponse } from '../../models/workout-copy.model';

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
