import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Observable, Subject, map, takeUntil } from 'rxjs';

import { TranslateService } from '@ngx-translate/core';

import {
  UserWorkoutsService,
  Workout,
} from '../../../../services/user/user-workouts/user-workouts.service';

import { LanguageService } from '../../../../services/shared/language.service';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  standalone: true,
  selector: 'app-workouts',
  imports: [...SHARED_IMPORTS],
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
    this.workouts$ = this.workoutsService.getWorkoutsByProgram(this.programId).pipe(
      map((workouts: Workout[]) => {
        /*
         * A workout completed állapotát
         * kizárólag a backend adja.
         */
        const mappedWorkouts = workouts.map((workout: Workout): Workout => ({
          ...workout,
          completed: workout.completed,
        }));

        // ----------------------------------------------------
        // EDZÉSEK SZÉTVÁLASZTÁSA
        // ----------------------------------------------------

        this.pendingWorkouts = mappedWorkouts.filter((workout: Workout) => !workout.completed);

        this.completedWorkouts = mappedWorkouts.filter((workout: Workout) => workout.completed);

        // ----------------------------------------------------
        // LAPOZÁS VISSZAÁLLÍTÁSA ADATBETÖLTÉSKOR
        // ----------------------------------------------------

        this.pendingCurrentPage = 1;
        this.completedCurrentPage = 1;

        return mappedWorkouts;
      }),
    );
  }

  // ============================================================
  // NAVIGÁCIÓ EXERCISE-OKHOZ
  // ============================================================

  goToExercises(workoutId: number, workoutName: string): void {
    this.router.navigate(['/user/workouts', workoutId, 'exercises'], {
      state: {
        workoutName,
        programId: this.programId,
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
