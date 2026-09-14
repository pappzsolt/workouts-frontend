import {
  Component,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';

import { HttpErrorResponse } from '@angular/common/http';

import { Subject, takeUntil } from 'rxjs';

import { ApiResponse } from '../../../../models/api-response.model';

import { Workout } from '../../../../models/workout.model';

import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';

import { LanguageService } from '../../../../services/shared/language.service';

import { SHARED_IMPORTS } from '../../shared-imports';

@Component({
  selector: 'app-coach-workout-board',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './coach-workout-board.component.html',
  styleUrls: ['./coach-workout-board.component.css'],
})
export class CoachWorkoutBoardComponent implements OnInit, OnChanges, OnDestroy {
  private readonly workoutService = inject(CoachWorkoutsService);

  private readonly languageService = inject(LanguageService);

  private readonly destroy$ = new Subject<void>();

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

  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {
    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadWorkouts();
    });
  }

  // ==========================================================
  // INPUT VÁLTOZÁS
  // ==========================================================

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['externalWorkouts'] && this.externalWorkouts?.length) {
      this.workouts = [...this.externalWorkouts];

      this.message = '';

      this.messageType = '';
    }
  }

  // ==========================================================
  // WORKOUTOK BETÖLTÉSE
  // ==========================================================

  loadWorkouts(): void {
    this.loading = true;

    this.message = '';

    this.messageType = '';

    this.workoutService.getMyWorkouts().subscribe({
      next: (res: ApiResponse<Workout[]>) => {
        this.loading = false;

        console.log('=== getMyWorkouts válasz ===');

        console.log('Teljes válasz:', res);

        console.log('Workoutok:', res.data);

        if (res.success && res.data?.length > 0) {
          this.workouts = [...res.data].sort((a: Workout, b: Workout) =>
            (a.name ?? a.workoutName ?? '').localeCompare(b.name ?? b.workoutName ?? ''),
          );

          console.log('Betöltött workoutok:', this.workouts);
        } else {
          this.workouts = [];

          this.message = 'coachWorkoutBoard.noWorkouts';

          this.messageType = 'error';

          console.log('Nincs workout a válaszban.');
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

  // ==========================================================
  // WORKOUT KIVÁLASZTÁS
  // ==========================================================

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

  // ==========================================================
  // DESTROY
  // ==========================================================

  ngOnDestroy(): void {
    this.destroy$.next();

    this.destroy$.complete();
  }
}
