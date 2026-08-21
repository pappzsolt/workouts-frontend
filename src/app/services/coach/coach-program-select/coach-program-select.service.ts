import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../api-endpoints';

export interface CoachProgram {
  programId: number;
  programName: string;
  programDescription?: string;
  durationDays?: number;
  difficultyLevel?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CoachProgramSelectService {
  private http = inject(HttpClient);

  getMyPrograms(): Observable<CoachProgram[]> {
    return this.http.get<CoachProgram[]>(
      API_ENDPOINTS.coachPrograms
    );
  }
}
