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
      console.error('Érvénytelen program ID:', this.programId);

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
        const mappedWorkouts = workouts.map((workout: Workout): Workout => {
          const frontendCompleted =
            localStorage.getItem(`workout-completed-${workout.workoutId}`) === 'true';

          return {
            ...workout,
            completed: frontendCompleted || workout.completed,
          };
        });

        this.pendingWorkouts = mappedWorkouts.filter((workout: Workout) => !workout.completed);

        this.completedWorkouts = mappedWorkouts.filter((workout: Workout) => workout.completed);

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
