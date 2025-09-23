import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface Training {
  id: number;
  title: string;
  date: string;
  attendees: number;
}

@Injectable({
  providedIn: 'root'
})
export class CoachWorkoutsService {

  constructor() { }

  // Demo adatok a coach/training menühöz
  getTrainings(): Observable<Training[]> {
    return of([
      { id: 1, title: 'Edzés 1333', date: '2025-09-25', attendees: 10 },
      { id: 2, title: 'Edzés 2', date: '2025-09-27', attendees: 8 },
      { id: 3, title: 'Edzés 3', date: '2025-09-30', attendees: 12 }
    ]);
  }
}
