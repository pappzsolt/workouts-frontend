import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface Exercise {
  id: number;
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserExercisesDetailService {

  constructor() {}

  // Tesztadatok user és workout alapján
  getExercisesByWorkout(workoutId: number): Observable<Exercise[]> {
    const testData: Exercise[] = [
      { id: 1, name: `Exercise detail1 (Workout ${workoutId})`, description: 'Bemelegítő gyakorlat' },
      { id: 2, name: `Exercise detail2 (Workout ${workoutId})`, description: 'Erőfejlesztő gyakorlat' },
      { id: 3, name: `Exercise detail3 (Workout ${workoutId})`, description: 'Nyújtó gyakorlat' }
    ];
    return of(testData);
  }
}
