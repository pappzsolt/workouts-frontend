import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ExercisesService, Exercise } from '../../services/exercises/exercises.service';
import { Observable } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-exercises',
  imports: [CommonModule],
  templateUrl: './exercises.component.html'
})
export class ExercisesComponent implements OnInit {
  workoutId!: number;
  exercises$!: Observable<Exercise[]>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private exercisesService: ExercisesService
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

