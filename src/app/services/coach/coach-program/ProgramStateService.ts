import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProgramStateService {
  private programIdSubject = new BehaviorSubject<number | null>(null);
  programId$ = this.programIdSubject.asObservable();

  setProgramId(id: number) {
    this.programIdSubject.next(id);
  }

  getProgramId(): number | null {
    return this.programIdSubject.getValue(); // visszaadja a jelenlegi értéket
  }
}
