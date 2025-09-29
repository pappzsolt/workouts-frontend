import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UserExerciseService, ExerciseDto } from '../../../../services/user/user-exercise/user-exercise.service';
import { Observable } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-user-exercises',
  imports: [CommonModule],
  templateUrl: './user-exercises.component.html'
})
export class UserExercisesComponent implements OnInit {
  workoutId!: number;
  exercises$!: Observable<ExerciseDto[]>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private exercisesService: UserExerciseService
  ) {}

  ngOnInit(): void {
    // a paraméter neve a route-ban: workoutId
    this.workoutId = Number(this.route.snapshot.paramMap.get('workoutId'));
    this.exercises$ = this.exercisesService.getExercisesByWorkout(this.workoutId);
  }

  goToExercise(exerciseId: number) {
    // navigálunk az exercise detail komponensre a workoutId-t is átadva
    this.router.navigate(['/user/workouts', this.workoutId, 'exercises', exerciseId]);
  }
}
