import { Component, OnInit } from '@angular/core';
import { WorkoutExercisesManagerService } from '../../../../services/coach/workout-exercises-manager.service';

@Component({
  selector: 'app-user-workouts-calendar',
  standalone: true,
  imports: [],
  templateUrl: './user-workouts-calendar.component.html',
  styleUrls: ['./user-workouts-calendar.component.css']
})
export class UserWorkoutsCalendarComponent implements OnInit {

  scheduledWorkouts: any[] = [];

  constructor(
    private workoutService: WorkoutExercisesManagerService
  ) {}

  ngOnInit(): void {
    this.loadScheduledWorkouts();
  }

  loadScheduledWorkouts(): void {

    this.workoutService
      .getScheduledWorkouts()
      .subscribe({
        next: workouts => {
          console.log('Scheduled workouts:', workouts);
          this.scheduledWorkouts = workouts ?? [];
        },
        error: err => {
          console.error(
            'Hiba az ütemezett workoutok lekérésekor:',
            err
          );

          this.scheduledWorkouts = [];
        }
      });
  }
}
