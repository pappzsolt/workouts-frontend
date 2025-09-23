import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface Training {
  id: number;
  programId?: number;           // kapcsolódó program ID
  name: string;
  description?: string;
  workout_date: string;
  duration_minutes?: number;
  intensity_level?: string;
  created_by_coach_id?: number;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CoachWorkoutsService {

  private workouts: Training[] = [
    { id: 1, programId: 1, name: 'Workout 1', workout_date: '2025-09-25', duration_minutes: 60, intensity_level: 'Medium', created_by_coach_id: 1 },
    { id: 2, programId: 1, name: 'Workout 2', workout_date: '2025-09-27', duration_minutes: 45, intensity_level: 'Hard', created_by_coach_id: 1 },
    { id: 3, programId: 2, name: 'Workout 3', workout_date: '2025-09-30', duration_minutes: 30, intensity_level: 'Easy', created_by_coach_id: 2 }
  ];

  // Összes edzés lekérése
  getTrainings(): Observable<Training[]> {
    return of(this.workouts);
  }

  // Edzések lekérése adott programhoz
  getWorkoutsByProgram(programId: number): Observable<Training[]> {
    const filtered = this.workouts.filter(w => w.programId === programId);
    return of(filtered);
  }

  // Edzés lekérése ID alapján
  getWorkoutById(id: number): Observable<Training | undefined> {
    const workout = this.workouts.find(w => w.id === id);
    return of(workout);
  }

  // Edzés frissítése
  updateWorkout(id: number, workout: Training): Observable<Training> {
    const index = this.workouts.findIndex(w => w.id === id);
    if (index > -1) {
      this.workouts[index] = { ...workout };
    }
    return of(workout);
  }

  // Új edzés létrehozása
  createWorkout(workout: Training): Observable<Training> {
    const newId = Math.max(...this.workouts.map(w => w.id)) + 1;
    const newWorkout = { ...workout, id: newId };
    this.workouts.push(newWorkout);
    return of(newWorkout);
  }

  // Edzés törlése
  deleteWorkout(id: number): Observable<void> {
    this.workouts = this.workouts.filter(w => w.id !== id);
    return of();
  }
}
