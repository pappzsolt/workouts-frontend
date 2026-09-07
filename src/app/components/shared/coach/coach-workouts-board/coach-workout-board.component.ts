import {
  Component,
  OnInit,
  OnChanges,
  SimpleChanges,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';

import { Workout } from '../../../../models/workout.model';
import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';

import { SHARED_IMPORTS } from '../../shared-imports';

@Component({
  selector: 'app-coach-workout-board',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './coach-workout-board.component.html',
  styleUrls: ['./coach-workout-board.component.css'],
})
export class CoachWorkoutBoardComponent implements OnInit, OnChanges {
  private workoutService = inject(CoachWorkoutsService);

  @Input()
  externalWorkouts: Workout[] = [];

  @Input()
  selectedWorkoutIds: number[] = [];

  @Input()
  multiSelect: boolean = true;

  @Output()
  workoutsChange = new EventEmitter<number[]>();

  workouts: Workout[] = [];

  loading = false;

  message = '';

  ngOnInit() {
    this.loadWorkouts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['externalWorkouts'] && this.externalWorkouts?.length) {
      this.workouts = [...this.externalWorkouts];
    }
  }

  loadWorkouts() {
    this.loading = true;

    this.workoutService.getMyWorkouts().subscribe({
      next: (res: any) => {
        this.loading = false;

        if (res.workouts?.length) {
          this.workouts = res.workouts.sort((a: Workout, b: Workout) =>
            (a.name ?? '').localeCompare(b.name ?? ''),
          );
        } else {
          this.message = 'coachWorkoutBoard.noWorkouts';
        }
      },

      error: (err) => {
        this.loading = false;

        this.message = 'coachWorkoutBoard.loadError';

        console.error('❌ Workoutok betöltése sikertelen', err);
      },
    });
  }

  toggleWorkoutSelection(id: number, checked: boolean) {
    if (this.multiSelect) {
      if (checked) {
        if (!this.selectedWorkoutIds.includes(id)) {
          this.selectedWorkoutIds.push(id);
        }
      } else {
        this.selectedWorkoutIds = this.selectedWorkoutIds.filter((wid) => wid !== id);
      }
    } else {
      this.selectedWorkoutIds = checked ? [id] : [];
    }

    // Minden változást jelez a wrapper felé
    this.workoutsChange.emit([...this.selectedWorkoutIds]);
  }
}
