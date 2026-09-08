import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  UserWorkoutsService,
  Workout,
} from '../../../../services/user/user-workouts/user-workouts.service';
import { Observable, map } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  standalone: true,
  selector: 'app-workouts',
  imports: [...SHARED_IMPORTS],
  styleUrl: './workouts.component.css',
  templateUrl: './workouts.component.html',
})
export class WorkoutsComponent implements OnInit {
  programId!: number;
  programName!: string;

  workouts$!: Observable<Workout[]>;

  pendingWorkouts: Workout[] = [];
  completedWorkouts: Workout[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workoutsService: UserWorkoutsService,
  ) {}

  ngOnInit(): void {
    this.programId = Number(this.route.snapshot.paramMap.get('id'));

    const navState = window.history.state;

    this.programName = navState.programName || '';

    this.workouts$ = this.workoutsService.getWorkoutsByProgram(this.programId).pipe(
      map((workouts) => {
        const mappedWorkouts = workouts.map((workout) => {
          const frontendCompleted =
            localStorage.getItem(`workout-completed-${workout.workoutId}`) === 'true';

          return {
            ...workout,
            completed: frontendCompleted || workout.completed,
          };
        });

        this.pendingWorkouts = mappedWorkouts.filter((workout) => !workout.completed);

        this.completedWorkouts = mappedWorkouts.filter((workout) => workout.completed);

        return mappedWorkouts;
      }),
    );
  }

  goToExercises(workoutId: number, workoutName: string): void {
    this.router.navigate(['/user/workouts', workoutId, 'exercises'], {
      state: {
        workoutName,
        programId: this.programId,
      },
    });
  }
}
