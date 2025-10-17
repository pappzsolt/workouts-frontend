import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private apiUrl = 'http://localhost:8080/api/programs/my/coach-programs'; // 🔹 javítva

  getMyPrograms(): Observable<CoachProgram[]> {
    return this.http.get<CoachProgram[]>(this.apiUrl);
  }
}

