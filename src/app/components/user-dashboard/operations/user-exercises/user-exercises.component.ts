import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, map } from 'rxjs';

import { UserExerciseService } from '../../../../services/user/user-exercise/user-exercise.service';

import { WorkoutDto, WorkoutExercise } from '../../../../models/exercise.model';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  standalone: true,
  selector: 'app-user-exercises',
  imports: [...SHARED_IMPORTS],
  styleUrl: './user-exercises.component.css',
  templateUrl: './user-exercises.component.html',
})
export class UserExercisesComponent implements OnInit {
  workoutId!: number;
  programId!: number;
  workoutName!: string;

  exercises$!: Observable<WorkoutExercise[]>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private exercisesService: UserExerciseService,
  ) {}

  ngOnInit(): void {
    /*
     * Route paraméterek
     */
    this.workoutId = Number(this.route.snapshot.paramMap.get('workoutId'));

    /*
     * A workout neve és a program ID
     * a navigation state-ből érkezik.
     */
    const navState = history.state;

    this.workoutName = navState['workoutName'] || 'userExercises.unknownWorkout';

    this.programId = Number(navState['programId']);

    /*
     * Workout lekérése a backendről.
     *
     * Backend válasz:
     *
     * {
     *   success: true,
     *   data: WorkoutDto,
     *   message: null
     * }
     *
     * Ezért:
     *
     * response.data
     *        ↓
     * WorkoutDto
     *        ↓
     * workout.exercises
     */
    this.exercises$ = this.exercisesService
      .getWorkoutExercises(this.programId, this.workoutId)
      .pipe(
        map((response) => {
          return response.data.exercises;
        }),
      );
  }

  goToExercise(exerciseId: number): void {
    this.router.navigate(['/user/workouts', this.workoutId, 'exercises', exerciseId], {
      state: {
        workoutName: this.workoutName,
        programId: this.programId,
      },
    });
  }
}
