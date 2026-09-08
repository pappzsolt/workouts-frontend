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
import { HttpErrorResponse } from '@angular/common/http';

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
  messageType: 'success' | 'error' | '' = '';

  ngOnInit(): void {
    this.loadWorkouts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['externalWorkouts'] && this.externalWorkouts?.length) {
      this.workouts = [...this.externalWorkouts];
      this.message = '';
      this.messageType = '';
    }
  }

  loadWorkouts(): void {
    this.loading = true;
    this.message = '';
    this.messageType = '';

    this.workoutService.getMyWorkouts().subscribe({
      next: (res: Workout[]) => {
        this.loading = false;

        if (res?.length) {
          this.workouts = res.sort((a: Workout, b: Workout) =>
            (a.name ?? a.workoutName ?? '').localeCompare(b.name ?? b.workoutName ?? ''),
          );
        } else {
          this.workouts = [];
          this.message = 'coachWorkoutBoard.noWorkouts';
          this.messageType = 'error';
        }
      },

      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.workouts = [];

        const backendMessage = typeof err.error === 'string' ? err.error : err.error?.message;

        this.message = backendMessage || 'coachWorkoutBoard.loadError';

        this.messageType = 'error';

        console.error('❌ Workoutok betöltése sikertelen', err);

        if (err.error) {
          console.error('Backend válasz:', err.error);
        }
      },
    });
  }

  toggleWorkoutSelection(id: number, checked: boolean): void {
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
