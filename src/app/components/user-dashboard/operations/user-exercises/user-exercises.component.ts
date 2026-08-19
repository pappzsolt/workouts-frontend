import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, map } from 'rxjs';

import { UserExerciseService } from '../../../../services/user/user-exercise/user-exercise.service';
import {
  WorkoutDto,
  WorkoutExercise
} from '../../../../models/exercise.model';

@Component({
  standalone: true,
  selector: 'app-user-exercises',
  imports: [CommonModule],
  templateUrl: './user-exercises.component.html'
})
export class UserExercisesComponent implements OnInit {

  workoutId!: number;
  workoutName!: string;
  exercises$!: Observable<WorkoutExercise[]>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private exercisesService: UserExerciseService
  ) {}

  ngOnInit(): void {
    // Route paraméterek
    this.workoutId = Number(
      this.route.snapshot.paramMap.get('workoutId')
    );

    // A workout neve a navigation state-ből érkezik
    this.workoutName = history.state['workoutName'];

    // Workout lekérése a backendről,
    // majd az exercise lista kivétele
    this.exercises$ = this.exercisesService
      .getWorkoutExercises(this.workoutId)
      .pipe(
        map((workout: WorkoutDto) => workout.exercises)
      );
  }

  goToExercise(exerciseId: number): void {
    this.router.navigate(
      ['/user/workouts', this.workoutId, 'exercises', exerciseId],
      {
        state: {
          workoutName: this.workoutName
        }
      }
    );
  }
}
