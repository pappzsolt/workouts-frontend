import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UserWorkoutsService, Workout } from '../../../../services/user/user-workouts/user-workouts.service';
import { Observable, map } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-workouts',
  imports: [CommonModule],
  styleUrl: './workouts.component.css',
  templateUrl: './workouts.component.html',
})
export class WorkoutsComponent implements OnInit {

  programId!: number;
  programName!: string;

  workouts$!: Observable<Workout[]>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workoutsService: UserWorkoutsService
  ) {}

  ngOnInit(): void {

    this.programId = Number(
      this.route.snapshot.paramMap.get('id')
    );

    // A program neve a navigation state-ből érkezik.
    const navState = window.history.state;

    this.programName =
      navState.programName || 'Unknown Program';

    this.workouts$ =
      this.workoutsService
        .getWorkoutsByProgram(this.programId)
        .pipe(
          map(workouts =>
            workouts.map(workout => {

              const frontendCompleted =
                localStorage.getItem(
                  `workout-completed-${workout.workoutId}`
                ) === 'true';

              if (frontendCompleted) {

                return {
                  ...workout,
                  completed: true
                };

              }

              return workout;
            })
          )
        );
  }

  /**
   * Navigáció a workout exercises oldalára.
   */
  goToExercises(
    workoutId: number,
    workoutName: string
  ): void {

    this.router.navigate(
      ['/user/workouts', workoutId, 'exercises'],
      {
        state: {
          workoutName
        }
      }
    );
  }
}
