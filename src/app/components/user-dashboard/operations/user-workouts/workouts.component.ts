import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Observable, Subject, forkJoin, map, takeUntil } from 'rxjs';

import { TranslateService } from '@ngx-translate/core';
import { SidePaginationComponent } from '../../../../components/shared/components/side-pagination/side-pagination.component';
import {
  UserWorkoutsService,
  Workout,
} from '../../../../services/user/user-workouts/user-workouts.service';

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
  programId!: number;

  programName!: string;

  workouts$!: Observable<Workout[]>;

  pendingWorkouts: Workout[] = [];

  completedWorkouts: Workout[] = [];

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

  get paginatedPendingWorkouts(): Workout[] {
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

  get paginatedCompletedWorkouts(): Workout[] {
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
      return;
    }

    const navState = window.history.state;

    // ==========================================================
    // NYELVVÁLTÁS FIGYELÉSE
    // ==========================================================

    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.programName =
        navState?.programName || this.translate.instant('userWorkouts.unknownProgram');

      this.loadWorkouts();
    });
  }

  // ============================================================
  // WORKOUTOK BETÖLTÉSE
  // ============================================================

  private loadWorkouts(): void {
    this.workouts$ = forkJoin({
      workouts: this.workoutsService.getWorkoutsByProgram(this.programId),
      scheduled: this.workoutsService.getScheduledWorkouts(),
    }).pipe(
      map(({ workouts, scheduled }) => {
        const programScheduled = scheduled.filter(
          (item) => item.programId === this.programId,
        );

        const mappedWorkouts = workouts.map((workout: Workout): Workout => {
          const candidates = programScheduled.filter(
            (item) => item.workoutId === workout.workoutId,
          );

          /*
           * Az új backend modellben a program_workout_id az occurrence
           * valódi azonosítója. Ha a /workouts/program válasz már ezt
           * tartalmazza, azt használjuk; egyébként csak akkor használunk
           * workoutId alapú fallbacket, ha egyetlen occurrence létezik.
           */
          const exact = workout.programWorkoutId
            ? candidates.find(
                (item) => item.programWorkoutId === workout.programWorkoutId,
              )
            : candidates.length === 1
              ? candidates[0]
              : undefined;

          return {
            ...workout,
            programWorkoutId: workout.programWorkoutId ?? exact?.programWorkoutId,
            userWorkoutId: workout.userWorkoutId ?? exact?.userWorkoutId,
            completed: workout.completed,
          };
        });

        this.pendingWorkouts = mappedWorkouts.filter((workout) => !workout.completed);
        this.completedWorkouts = mappedWorkouts.filter((workout) => workout.completed);

        this.pendingCurrentPage = 1;
        this.completedCurrentPage = 1;

        return mappedWorkouts;
      }),
    );
  }

  // ============================================================
  // NAVIGÁCIÓ EXERCISE-OKHOZ
  // ============================================================

  goToExercises(workout: Workout): void {
    if (!workout.userWorkoutId) {
      console.error(
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
      state: {
        workoutName: workout.workoutName,
        programId: this.programId,
        programWorkoutId: workout.programWorkoutId,
        userWorkoutId: workout.userWorkoutId,
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
}
