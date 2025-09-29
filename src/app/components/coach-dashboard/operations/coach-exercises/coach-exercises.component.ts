import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CoachExercisesService, Exercise } from '../../../../services/coach/coach-exercises/coach-exercises.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { USER_MESSAGES } from '../../../../constants/user-messages';

@Component({
  selector: 'app-coach-exercises',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coach-exercises.component.html',
  styleUrls: ['./coach-exercises.component.css']
})
export class CoachExercisesComponent implements OnInit {
  exercises$!: Observable<Exercise[]>;
  workoutId = 1; // Teszt workout ID
  message: string = '';

  constructor(
    private coachExercisesService: CoachExercisesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadExercises();
  }

  loadExercises() {
    this.exercises$ = this.coachExercisesService.getExercisesByWorkout(this.workoutId).pipe(
      catchError((err) => {
        this.message = USER_MESSAGES.loadProgramsError; // Hibakezelés
        return of([]); // Hibánál üres lista
      })
    );
  }

  goToExercise(exerciseId: number) {
    this.router.navigate(['/coach/exercises', exerciseId, 'edit']).catch(() => {
      this.message = USER_MESSAGES.programClickError; // Navigációs hiba üzenet
    });
  }
}

