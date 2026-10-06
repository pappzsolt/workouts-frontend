import { errorMessage, responseMessage } from '../../../../models/backend-dto/common/api-response-message';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { LoggerService } from '../../../../services/logger.service';
import { ActivatedRoute, Router } from '@angular/router';

import { Subject, Subscription, takeUntil } from 'rxjs';

import { TranslateService } from '@ngx-translate/core';
import { SidePaginationComponent } from '../../../../components/shared/components/side-pagination/side-pagination.component';
import { UserWorkoutsService } from '../../../../services/user/user-workouts/user-workouts.service';
import type { UserWorkoutOccurrence } from '../../../../models/user-workout-occurrence.model';

import { LanguageService } from '../../../../services/shared/language.service';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  standalone: true,
  selector: 'app-workouts',
  imports: [...SHARED_IMPORTS, SidePaginationComponent],
  styleUrl: './workouts.component.css',
  templateUrl: './workouts.component.html',
})
export class WorkoutsComponent implements OnInit, OnDestroy {
  private readonly logger = inject(LoggerService);

  programId!: number;

  programName!: string;

  private loadRequest?: Subscription;
  workouts: UserWorkoutOccurrence[] = [];
  loading = false;
  loaded = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  pendingWorkouts: UserWorkoutOccurrence[] = [];

  completedWorkouts: UserWorkoutOccurrence[] = [];

  // ============================================================
  // AKTÍV EDZÉS TAB
  // ============================================================

  activeTab: 'pending' | 'completed' = 'pending';

  // ============================================================
  // FÜGGŐBEN LÉVŐ EDZÉSEK LAPOZÁSA
  // ============================================================

  pendingCurrentPage = 1;

  pendingPageSize = 1;

  // ============================================================
  // TELJESÍTETT EDZÉSEK LAPOZÁSA
  // ============================================================

  completedCurrentPage = 1;

  completedPageSize = 1;

  // ============================================================
  // TABVÁLTÁS
  // ============================================================

  setActiveTab(tab: 'pending' | 'completed'): void {
    this.activeTab = tab;
  }

  // ============================================================
  // FÜGGŐBEN LÉVŐ EDZÉSEK LAPOZÁSA
  // ============================================================

  get paginatedPendingWorkouts(): UserWorkoutOccurrence[] {
    const startIndex = (this.pendingCurrentPage - 1) * this.pendingPageSize;

    return this.pendingWorkouts.slice(startIndex, startIndex + this.pendingPageSize);
  }

  onPendingPageChange(page: number): void {
    this.pendingCurrentPage = page;
  }

  onPendingPageSizeChange(pageSize: number): void {
    this.pendingPageSize = pageSize;
    this.pendingCurrentPage = 1;
  }

  // ============================================================
  // TELJESÍTETT EDZÉSEK LAPOZÁSA
  // ============================================================

  get paginatedCompletedWorkouts(): UserWorkoutOccurrence[] {
    const startIndex = (this.completedCurrentPage - 1) * this.completedPageSize;

    return this.completedWorkouts.slice(startIndex, startIndex + this.completedPageSize);
  }

  onCompletedPageChange(page: number): void {
    this.completedCurrentPage = page;
  }

  onCompletedPageSizeChange(pageSize: number): void {
    this.completedPageSize = pageSize;
    this.completedCurrentPage = 1;
  }

  // ============================================================
  // DESTROY SUBJECT
  // ============================================================

  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workoutsService: UserWorkoutsService,
    private translate: TranslateService,
    private languageService: LanguageService,
  ) {}

  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {
    this.programId = Number(this.route.snapshot.paramMap.get('id'));

    if (Number.isNaN(this.programId) || this.programId <= 0) {
      this.message = 'userWorkouts.loadError'; this.messageType = 'error';
      return;
    }

    const programName = this.route.snapshot.queryParamMap.get('programName');

    // ==========================================================
    // NYELVVÁLTÁS FIGYELÉSE
    // ==========================================================

    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.programName =
        programName || this.translate.instant('userWorkouts.unknownProgram');

      this.loadWorkouts();
    });
  }

  // ============================================================
  // WORKOUTOK BETÖLTÉSE
  // ============================================================

  private loadWorkouts(): void {
    this.loadRequest?.unsubscribe();
    this.loading = true; this.loaded = false; this.message = '';
    this.loadRequest = this.workoutsService.getWorkoutsByProgram(this.programId)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: response => {
          this.loading = false;
          this.loaded = response.success;
          this.message = responseMessage([response], response.success ? '' : 'userWorkouts.loadError');
          this.messageType = response.success ? 'info' : 'error';
          this.workouts = response.success ? response.data ?? [] : [];
          this.pendingWorkouts = this.workouts.filter(workout => workout.completed !== true);
          this.completedWorkouts = this.workouts.filter(workout => workout.completed === true);
          this.pendingCurrentPage = 1; this.completedCurrentPage = 1;
        },
        error: error => {
          this.loading = false; this.loaded = false;
          this.workouts = []; this.pendingWorkouts = []; this.completedWorkouts = [];
          this.message = errorMessage(error, 'userWorkouts.loadError'); this.messageType = 'error';
        },
      });
  }

  // ============================================================
  // NAVIGÁCIÓ EXERCISE-OKHOZ
  // ============================================================

  goToExercises(workout: UserWorkoutOccurrence): void {
    if (!workout.userWorkoutId) {
      this.logger.error(
        '[UserWorkouts] Nem található a konkrét userWorkoutId.',
        {
          programId: this.programId,
          workoutId: workout.workoutId,
          programWorkoutId: workout.programWorkoutId,
        },
      );
      return;
    }

    this.router.navigate(['/user/workouts', workout.workoutId, 'exercises'], {
      queryParams: {
        programId: this.programId,
        programWorkoutId: workout.programWorkoutId,
        userWorkoutId: workout.userWorkoutId,
        workoutName: workout.workoutName,
      },
    });
  }

  // ============================================================
  // DESTROY
  // ============================================================

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByWorkout(index: number, workout: UserWorkoutOccurrence): number | string {
    return workout.userWorkoutId ?? workout.programWorkoutId ?? `${workout.workoutId}-${workout.workoutDate}`;
  }

}
