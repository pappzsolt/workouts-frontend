import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, catchError, of } from 'rxjs';

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
  private apiUrl = 'http://localhost:8080/api/programs/my/assigned-programs';

  constructor(private http: HttpClient) {}

  getPrograms(): Observable<UserProgram[]> {
    console.log('getPrograms() called'); // 🔹 ellenőrzés, hogy a service hívódik-e

    return this.http.get<any>(this.apiUrl).pipe(
      tap(res => console.log('🔹 Raw API response:', res)), // nyers válasz

      map(res => {
        if (!res || !res.data) {
          console.warn('⚠️ API response does not have a data property', res);
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

      tap(programs => console.log('🔹 Mapped programs:', programs)), // feldolgozott adat
      catchError(err => {
        console.error('❌ Error fetching programs:', err);
        return of([]); // hibánál üres lista
      })
    );
  }
}
