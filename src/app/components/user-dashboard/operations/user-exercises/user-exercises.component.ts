import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CoachExercisesService, Exercise } from '../../../../services/coach/coach-exercises/coach-exercises.service';
import { Observable } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-exercises',
  imports: [CommonModule],
  templateUrl: './user-exercises.component.html'
})
export class UserExercisesComponent implements OnInit {
  workoutId!: number;
  exercises$!: Observable<Exercise[]>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private exercisesService: CoachExercisesService
  ) {}

  ngOnInit(): void {
    this.workoutId = Number(this.route.snapshot.paramMap.get('id'));
    this.exercises$ = this.exercisesService.getExercisesByWorkout(this.workoutId);
  }

  goToExercise(exerciseId: number) {
    // navigálunk az exercise detail komponensre
    this.router.navigate(['/user/exercises', exerciseId]);
  }
}

