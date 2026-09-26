import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Subject, takeUntil } from 'rxjs';

import { CoachWorkoutsService } from '../../../../../services/coach/coach-workouts/coach-workouts.service';
import { LanguageService } from '../../../../../services/shared/language.service';
import { AppCardComponent } from '../../../../shared/components/app-card/app-card.component';
import { Workout } from '../../../../../models/workout.model';
import { AppSelectComponent } from '../../../../../components/shared/components/app-select/app-select.component';
import { SHARED_IMPORTS } from '../../../../shared/shared-imports';

@Component({
  selector: 'app-newworkout',
  templateUrl: './new-workout.component.html',
  styleUrls: ['./new-workout.component.css'],
  standalone: true,
  imports: [...SHARED_IMPORTS, AppCardComponent, AppSelectComponent],
})
export class NewWorkoutComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  workouts: Workout[] = [];

  newWorkout = {
    name: '',
    description: '',
    workoutDate: '',
    durationMinutes: 0,
    intensityLevel: '',
    done: false,
  };

  message: string = '';

  messageType: 'success' | 'error' | '' = '';

  constructor(
    private coachWorkoutsService: CoachWorkoutsService,
    private languageService: LanguageService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const fromProgramBuilder = this.route.snapshot.queryParamMap.get('fromProgramBuilder');

    const programId = this.route.snapshot.queryParamMap.get('programId');



    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadWorkouts();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();

    this.destroy$.complete();
  }

  loadWorkouts(): void {
    this.coachWorkoutsService.getMyWorkouts().subscribe({
      next: (res) => {
        this.workouts = res.data || [];
      },

      error: (err) => {
        console.error('Hiba a workoutok betöltésekor', err);

        this.workouts = [];

        this.message = 'newWorkout.loadError';

        this.messageType = 'error';
      },
    });
  }

  addWorkout(): void {
    this.coachWorkoutsService.addWorkout(this.newWorkout).subscribe({
      next: (res) => {
        this.message = 'newWorkout.createSuccess';

        this.messageType = 'success';

        // Megnézzük, hogy a Program Builderből
        // érkeztünk-e.
        const fromProgramBuilder = this.route.snapshot.queryParamMap.get('fromProgramBuilder');

        // Az aktuális program ID-ja.
        const programId = this.route.snapshot.queryParamMap.get('programId');

        // ==================================================
        // PROGRAM BUILDERBŐL ÉRKEZTÜNK
        // ==================================================

        if (fromProgramBuilder === 'true' && programId) {
          /**
           * A WorkoutResponse modell alapján
           * az új workout azonosítója:
           *
           * res.id
           */
          const workoutId = res.id;

          if (workoutId === undefined || workoutId === null) {
            this.message = 'newWorkout.createIdMissing';

            this.messageType = 'error';

            return;
          }

          // ==================================================
          // NAVIGÁCIÓ AZ EXERCISE HOZZÁRENDELÉS OLDALRA
          // ==================================================

          this.router.navigate(['/coach/assign-workouts-exercises'], {
            queryParams: {
              workoutId: workoutId,
              fromProgramBuilder: 'true',
              programId: programId,
            },
          });

          return;
        }

        // ==================================================
        // NORMÁL WORKOUT LÉTREHOZÁS
        // ==================================================

        const workoutId = res.id;

        if (workoutId === undefined || workoutId === null) {
          this.message = 'newWorkout.createIdMissing';

          this.messageType = 'error';

          return;
        }

        this.router.navigate(['/coach/assign-workouts-exercises'], {
          queryParams: {
            workoutId: workoutId,
          },
        });
      },

      error: () => {
        this.message = 'newWorkout.createError';

        this.messageType = 'error';
      },
    });
  }

  private resetForm(): void {
    this.newWorkout = {
      name: '',
      description: '',
      workoutDate: '',
      durationMinutes: 0,
      intensityLevel: '',
      done: false,
    };
  }
}
