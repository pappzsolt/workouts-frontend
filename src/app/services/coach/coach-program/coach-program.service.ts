import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

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

  // Teszt adatok (mock)
  private mockPrograms: Program[] = [
    { id: 1, name: 'Strength Training', description: 'Build muscle', duration_days: 30, difficulty_level: 'Medium', coach_id: 1 },
    { id: 2, name: 'Cardio Blast', description: 'Improve stamina', duration_days: 20, difficulty_level: 'Hard', coach_id: 1 },
    { id: 3, name: 'Yoga Basics', description: 'Flexibility and relaxation', duration_days: 15, difficulty_level: 'Easy', coach_id: 1 },
  ];

  constructor() { }

  // Programok lekérése coach_id alapján
  getProgramsByCoach(coachId: number): Observable<Program[]> {
    const programs = this.mockPrograms.filter(p => p.coach_id === coachId);
    return of(programs);
  }

  // Program lekérése ID alapján (szerkesztéshez)
  getProgramById(id: number): Observable<Program | undefined> {
    const program = this.mockPrograms.find(p => p.id === id);
    return of(program);
  }

  // Üres create metódus
  create(program: Program): Observable<Program> {
    // Mock: egyszerűen visszaadjuk a paramétert
    return of(program);
  }

  // Program frissítése
  updateProgram(id: number, updatedProgram: Program): Observable<Program | undefined> {
    const index = this.mockPrograms.findIndex(p => p.id === id);
    if (index !== -1) {
      this.mockPrograms[index] = { ...updatedProgram };
      return of(this.mockPrograms[index]);
    }
    return of(undefined);
  }

}
