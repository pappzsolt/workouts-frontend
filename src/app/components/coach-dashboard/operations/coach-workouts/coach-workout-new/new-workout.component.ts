import { createInputValidationGuard } from '../../../../shared/components/form-controls/app-input.directive';
import {
  errorMessage,
  responseMessage,
} from '../../../../../models/backend-dto/common/api-response-message';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { LoggerService } from '../../../../../services/logger.service';
import { ActivatedRoute, Router } from '@angular/router';

import { Subject, finalize, takeUntil } from 'rxjs';

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
  private readonly validateInputs = createInputValidationGuard();
  private readonly logger = inject(LoggerService);

  private readonly destroy$ = new Subject<void>();

  workouts: Workout[] = [];
  saving = false;

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
    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadWorkouts();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();

    this.destroy$.complete();
  }

  loadWorkouts(): void {
    this.coachWorkoutsService
      .getMyWorkouts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.workouts = res.data || [];
        },

        error: (err) => {
          this.logger.error('Hiba a workoutok betöltésekor', err);

          this.workouts = [];

          this.message = 'newWorkout.loadError';

          this.messageType = 'error';
        },
      });
  }

  addWorkout(): void {
    if (!this.validateInputs()) return;
    if (this.saving) return;
    this.saving = true;
    this.message = '';
    this.messageType = '';
    this.coachWorkoutsService
      .addWorkout({ ...this.newWorkout })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: (res) => {
          if (!res.success) {
            this.message = responseMessage([res], 'newWorkout.createError');
            this.messageType = 'error';
            return;
          }
          const workoutId = res.data?.id;
          if (workoutId == null || !Number.isInteger(workoutId) || workoutId <= 0) {
            this.message = 'newWorkout.createIdMissing';
            this.messageType = 'error';
            return;
          }
          this.message = responseMessage([res], 'newWorkout.createSuccess');
          this.messageType = 'success';
          const fromProgramBuilder = this.route.snapshot.queryParamMap.get('fromProgramBuilder');
          const programId = this.route.snapshot.queryParamMap.get('programId');
          this.router.navigate(['/coach/assign-workouts-exercises'], {
            queryParams:
              fromProgramBuilder === 'true' && programId
                ? { workoutId, fromProgramBuilder: 'true', programId }
                : { workoutId },
          });
        },
        error: (error) => {
          this.message = errorMessage(error, 'newWorkout.createError');
          this.messageType = 'error';
        },
      });
  }
}
