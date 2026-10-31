import { createInputValidationGuard } from '../../../../shared/components/form-controls/app-input.directive';
import { INTENSITY_OPTIONS } from '../../../../../constants/intensity';
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
import type { WorkoutForm } from '../../../../../models/workout/workout-form.model';
import type { WorkoutCatalogItem } from '../../../../../models/workout/workout-catalog-item.model';
import { AppSelectComponent } from '../../../../../components/shared/components/app-select/app-select.component';
import { AppFormValidationDirective } from '../../../../shared/components/form-controls/app-form-validation.directive';
import { AppInputDirective } from '../../../../shared/components/form-controls/app-input.directive';
import { AppTextareaDirective } from '../../../../shared/components/form-controls/app-textarea.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../../../../shared/components/message/message.component';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-newworkout',
  templateUrl: './new-workout.component.html',
  styleUrls: ['./new-workout.component.css'],
  standalone: true,
  imports: [
    AppFormValidationDirective,
    AppInputDirective,
    AppTextareaDirective,
    CommonModule,
    FormsModule,
    TranslatePipe,
    MessageComponent,
    AppButtonComponent,
    FormFieldComponent,
    AppIconComponent,
    AppCardComponent,
    AppSelectComponent,
  ],
})
export class NewWorkoutComponent implements OnInit, OnDestroy {
  readonly intensityOptions = INTENSITY_OPTIONS;
  private readonly validateInputs = createInputValidationGuard();
  private readonly logger = inject(LoggerService);

  private readonly destroy$ = new Subject<void>();

  workouts: WorkoutCatalogItem[] = [];
  saving = false;

  newWorkout: WorkoutForm = {
    name: '',
    description: '',
    workoutDate: '',
    durationMinutes: undefined,
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
          void this.router.navigate(['/coach/workouts', workoutId, 'edit']);
        },
        error: (error) => {
          this.message = errorMessage(error, 'newWorkout.createError');
          this.messageType = 'error';
        },
      });
  }
}
