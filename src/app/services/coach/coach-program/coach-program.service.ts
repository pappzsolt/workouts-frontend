import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interface definíció
export interface Program {
  id?: number;  // opcionális
  name: string;
  description?: string;
  duration_days?: number;
  difficulty_level?: string;
  coach_id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CoachProgramService {

  private apiUrl = 'http://localhost:8080/api/user-programs/create';

  constructor(private http: HttpClient) { }

  // Program létrehozása a backendben
  create(program: Program): Observable<any> {
    const payload = {
      programName: program.name,
      programDescription: program.description,
      durationDays: program.duration_days,
      difficultyLevel: program.difficulty_level
    };
    return this.http.post<any>(this.apiUrl, payload);
  }
}
