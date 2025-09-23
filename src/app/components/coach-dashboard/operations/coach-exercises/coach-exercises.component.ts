import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CoachExercisesService, Exercise } from '../../../../services/coach/coach-exercises/coach-exercises.service';
import { Observable } from 'rxjs';

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

  constructor(
    private coachExercisesService: CoachExercisesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.exercises$ = this.coachExercisesService.getExercisesByWorkout(this.workoutId);
  }

  goToExercise(exerciseId: number) {
    this.router.navigate(['/coach/exercises', exerciseId, 'edit']);
  }
}

