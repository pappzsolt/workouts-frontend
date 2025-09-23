import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface Statistic {
  workoutCompleted: number;
  totalHours: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserStatisticsService {
  constructor() {}

  getStatistics(): Observable<Statistic> {
    return of({
      workoutCompleted: 15,
      totalHours: 20
    });
  }
}
