import { Component, OnInit, OnChanges, OnDestroy, SimpleChanges, Input, Output, EventEmitter, inject } from '@angular/core';
import { LoggerService } from '../../../../services/logger.service';

import { HttpErrorResponse } from '@angular/common/http';

import { Subject, Subscription, takeUntil } from 'rxjs';

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
  private readonly logger = inject(LoggerService);

  private readonly workoutService = inject(CoachWorkoutsService);

  private readonly languageService = inject(LanguageService);

  private readonly destroy$ = new Subject<void>();

  @Input()
  externalWorkouts: Workout[] | null = null;

  private request?: Subscription;
  private initialized = false;

  @Input()
  selectedWorkoutIds: number[] = [];

  @Input()
  multiSelect: boolean = true;

  /**
   * Kompakt kiválasztási nézet.
   *
   * Az assignment oldalon a kártyás nézet helyett
   * sűrűbb, mobilbarát listát használunk.
   * Más oldalakon az alapértelmezett false miatt semmi nem változik.
   */
  @Input()
  compactSelection = false;

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
    this.initialized = true;
    if (this.compactSelection) {
      this.itemsPerPage = 8;
    }

    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadWorkouts();
    });
  }

  // ==========================================================
  // INPUT VÁLTOZÁS
  // ==========================================================

  ngOnChanges(changes: SimpleChanges): void {
    if (this.initialized && changes['externalWorkouts']) {
      this.currentPage = 1;
      this.loadWorkouts();
    }
  }

  // ==========================================================
  // WORKOUTOK BETÖLTÉSE
  // ==========================================================

  loadWorkouts(): void {
    this.request?.unsubscribe();
    if (this.externalWorkouts != null) {
      const term = this.searchTerm.trim().toLocaleLowerCase();
      const filtered = this.externalWorkouts
        .filter((workout) => workout.name?.toLocaleLowerCase().includes(term))
        .slice()
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '') *
          (this.sortDirection === 'asc' ? 1 : -1));
      this.totalPages = Math.max(1, Math.ceil(filtered.length / this.itemsPerPage));
      this.currentPage = Math.min(this.currentPage, this.totalPages);
      this.workouts = filtered.slice((this.currentPage - 1) * this.itemsPerPage,
        this.currentPage * this.itemsPerPage);
      this.loading = false;
      this.message = filtered.length ? '' : 'coachWorkoutBoard.noWorkouts';
      this.messageType = filtered.length ? '' : 'error';
      return;
    }
    this.loading = true;

    this.message = '';
    this.messageType = '';

    const backendPage = this.currentPage - 1;

    this.request = this.workoutService
      .searchMyWorkouts(
        this.searchTerm.trim(),
        backendPage,
        this.itemsPerPage,
        this.languageService.getCurrentLanguage(),
        this.sortDirection,
      )
      .pipe(takeUntil(this.destroy$))
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

          this.logger.error('❌ Workoutok betöltése sikertelen', err);

          if (err.error) {
            this.logger.error('Backend válasz:', err.error);
          }
        },
      });
  }

  // ==========================================================
  // WORKOUT KIVÁLASZTÁS
  // ==========================================================

  onWorkoutCheckboxChange(event: Event, workoutId: number | undefined): void {
    if (workoutId == null) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.toggleWorkoutSelection(workoutId, target.checked);
  }

  toggleWorkoutSelection(id: number, checked: boolean): void {
    if (this.multiSelect) {
      if (checked) {
        if (!this.selectedWorkoutIds.includes(id)) {
          this.selectedWorkoutIds = [...this.selectedWorkoutIds, id];
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
    this.request?.unsubscribe();
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
