import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface Program {
  id: number;
  name: string;
  durationWeeks: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserMyProgramsService {
  constructor() {}

  getPrograms(): Observable<Program[]> {
    return of([
      { id: 1, name: 'Beginner Program', durationWeeks: 4 },
      { id: 2, name: 'Advanced Program', durationWeeks: 8 }
    ]);
  }
}
