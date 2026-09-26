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

import { Workout } from '../../../../models/workout.model';
import { AppSearchComponent } from '../../components/app-search/app-search.component';
import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { AppCardComponent } from '../../../../components/shared/components/app-card/app-card.component';
import { LanguageService } from '../../../../services/shared/language.service';

import { SHARED_IMPORTS } from '../../shared-imports';

@Component({
  selector: 'app-coach-workout-board',
  standalone: true,
  imports: [...SHARED_IMPORTS, AppSearchComponent, AppCardComponent],
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

  currentPage = 1;
  itemsPerPage = 6;
  totalPages = 1;

  searchTerm = '';

  sortDirection: 'asc' | 'desc' = 'asc';

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

    const backendPage = this.currentPage - 1;

    this.workoutService
      .searchMyWorkouts(
        this.searchTerm.trim(),
        backendPage,
        this.itemsPerPage,
        'hu',
        this.sortDirection,
      )
      .subscribe({
        next: (res) => {
          this.loading = false;


          if (res.content?.length) {
            this.workouts = [...res.content];

            this.totalPages = Math.max(1, res.totalPages);

          } else {
            this.workouts = [];
            this.totalPages = 1;

            this.message = 'coachWorkoutBoard.noWorkouts';
            this.messageType = 'error';

          }
        },

        error: (err: HttpErrorResponse) => {
          this.loading = false;

          this.workouts = [];
          this.totalPages = 1;

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
  // ==========================================================
  // KERESÉS
  // ==========================================================

  onSearchChange(): void {
    this.currentPage = 1;

    this.loadWorkouts();
  }

  // ==========================================================
  // RENDEZÉS
  // ==========================================================

  toggleSort(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';

    this.currentPage = 1;

    this.loadWorkouts();
  }

  // ==========================================================
  // LAPOZÁS
  // ==========================================================

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;

      this.loadWorkouts();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;

      this.loadWorkouts();
    }
  }
  // ==========================================================
  // LAPOZÁS
  // ==========================================================

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadWorkouts();
    }
  }
}
