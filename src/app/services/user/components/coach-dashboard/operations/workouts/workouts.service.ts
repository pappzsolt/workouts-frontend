import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export interface Workout {
  id: number;
  name: string;
  description: string;
  // ide jöhetnek más mezők is
}

@Injectable({
  providedIn: 'root'
})
export class WorkoutsService {
  private apiUrl = '/api/programs'; // backend API alap URL

  constructor(private http: HttpClient) {}

  // Eredeti backend hívás
  getWorkoutsByProgram(programId: number): Observable<Workout[]> {
    // Ideiglenesen tesztadatokkal tér vissza
    return this.getTestWorkouts(programId);

    // Ha később kész a backend:
    // return this.http.get<Workout[]>(`${this.apiUrl}/${programId}/workouts`);
  }

  // Tesztadatok metódus
  private getTestWorkouts(programId: number): Observable<Workout[]> {
    const testData: Workout[] = [
      { id: 1, name: `Workout A (Program ${programId})`, description: 'Ez az első teszt workout  user ????????' },
      { id: 2, name: `Workout B (Program ${programId})`, description: 'Ez a második teszt workout' },
      { id: 3, name: `Workout C (Program ${programId})`, description: 'Ez a harmadik teszt workout' }
    ];
    return of(testData);
  }
}
