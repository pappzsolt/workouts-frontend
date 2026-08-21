import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { USER_MESSAGES } from '../../../constants/user-messages';
import { API_ENDPOINTS } from '../../../api-endpoints';

export interface UserProgram {
  id: number;
  name: string;
  description: string;
  durationWeeks: number;
  difficulty: string;
  status: string;
  assignedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserMyProgramsService {

  private apiUrl = API_ENDPOINTS.assignedPrograms;

  constructor(private http: HttpClient) {}

  getPrograms(): Observable<UserProgram[]> {

    return this.http.get<any>(this.apiUrl).pipe(
      map(res => {
        if (!res || !res.data) {
          return [];
        }

        return res.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          durationWeeks: Math.ceil(p.durationDays / 7),
          difficulty: p.difficulty,
          status: p.status,
          assignedAt: p.assignedAt
        }));
      }),
      catchError(() => {
        return of([]);
      })
    );
  }
}
