import { errorMessage, responseMessage } from '../../../../models/backend-dto/common/api-response-message';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { intensityLabelKey } from '../../../../constants/intensity';
import { LoggerService } from '../../../../services/logger.service';
import { ActivatedRoute, Router } from '@angular/router';

import { Subject, Subscription, takeUntil } from 'rxjs';

import { TranslateService } from '@ngx-translate/core';
import { SidePaginationComponent } from '../../../../components/shared/components/side-pagination/side-pagination.component';
import { UserWorkoutsService } from '../../../../services/user/user-workouts/user-workouts.service';
import { UserMyProgramsService } from '../../../../services/user/user-my-program/user-my-programs.service';
import type { UserWorkoutOccurrence } from '../../../../models/user-workout-occurrence.model';

import { LanguageService } from '../../../../services/shared/language.service';

import { AppBadgeComponent } from '../../../shared/components/app-badge/app-badge.component';
import { AppSectionHeaderComponent } from '../../../shared/components/app-page-header/app-page-header.component';
import { AppHeadingDirective } from '../../../shared/components/app-page-header/app-page-header.component';
import { AppLoadingComponent } from '../../../shared/components/app-state/app-state.component';
import { AppTabsComponent } from '../../../shared/components/app-tabs/app-tabs.component';
import { AppTabDirective } from '../../../shared/components/app-tabs/app-tabs.component';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { AppCardComponent } from '../../../shared/components/app-card/app-card.component';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';

@Component({
  standalone: true,
  selector: 'app-workouts',
  imports: [
    AppBadgeComponent,
    AppSectionHeaderComponent,
    AppHeadingDirective,
    AppLoadingComponent,
    AppTabsComponent,
    AppTabDirective,
    CommonModule,
    TranslatePipe,
    MessageComponent,
    AppCardComponent,
    AppIconComponent,
    SidePaginationComponent,
  ],
  styleUrl: './workouts.component.css',
  templateUrl: './workouts.component.html',
})
export class WorkoutsComponent implements OnInit, OnDestroy {
  readonly intensityLabelKey = intensityLabelKey;
  private readonly logger = inject(LoggerService);
  private readonly myProgramsService = inject(UserMyProgramsService);

  programId!: number;

  /** A program neve; a linkből jön, vagy (ha hiányzik) a felhasználó programjai közül töltődik be. */
  programName: string | null = null;
  programNameMissing = false;

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
      if (programName) {
        this.programName = programName;
      } else {
        this.loadProgramName();
      }

      this.loadWorkouts();
    });
  }

  /** Ha a link nem hozza a program nevét (pl. visszalépés, újratöltés), a felhasználó programjai közül. */
  private loadProgramName(): void {
    this.myProgramsService
      .getPrograms()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          const name = response.data?.find(program => program.id === this.programId)?.name ?? null;
          this.programName = name;
          this.programNameMissing = !name;
        },
        error: () => {
          this.programName = null;
          this.programNameMissing = true;
        },
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
          this.workouts = response.success
            ? [...(response.data ?? [])].sort(compareByWorkoutDate)
            : [];
          this.pendingWorkouts = this.workouts.filter(workout => workout.completed !== true);
          this.completedWorkouts = this.workouts
            .filter(workout => workout.completed === true)
            .sort((a, b) =>
              (b.performedAt || b.workoutDate || '').localeCompare(a.performedAt || a.workoutDate || ''),
            );
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
        programName: this.programName,
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

/**
 * Ascending by workoutDate (ISO yyyy-MM-dd strings sort correctly as text).
 * The backend DTO allows a null date: such occurrences go to the end instead of
 * crashing the whole list with "can't access property localeCompare".
 */
function compareByWorkoutDate(
  a: { workoutDate?: string | null },
  b: { workoutDate?: string | null },
): number {
  if (!a.workoutDate) return b.workoutDate ? 1 : 0;
  if (!b.workoutDate) return -1;
  return a.workoutDate.localeCompare(b.workoutDate);
}
