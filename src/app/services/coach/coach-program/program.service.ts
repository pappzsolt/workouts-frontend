import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Program {
  id?: number;
  name: string;
  description?: string;
  duration_days?: number;
  difficulty_level?: string;
  coach_id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProgramService {

  private apiUrl = '/api/programs'; // backend endpoint

  constructor(private http: HttpClient) { }

  getAll(): Observable<Program[]> {
    return this.http.get<Program[]>(this.apiUrl);
  }

  getById(id: number): Observable<Program> {
    return this.http.get<Program>(`${this.apiUrl}/${id}`);
  }

  create(program: Program): Observable<Program> {
    return this.http.post<Program>(this.apiUrl, program);
  }

  update(id: number, program: Program): Observable<Program> {
    return this.http.put<Program>(`${this.apiUrl}/${id}`, program);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
