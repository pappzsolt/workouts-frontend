import { createInputValidationGuard } from '../../../../shared/components/form-controls/app-input.directive';
import { errorMessage, responseMessage } from '../../../../../models/backend-dto/common/api-response-message';
import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { LoggerService } from '../../../../../services/logger.service';
import { HttpErrorResponse } from '@angular/common/http';

import { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Exercise } from '../../../../../models/exercise.model';
import { AppSelectComponent } from '../../../../../components/shared/components/app-select/app-select.component';
import { SHARED_IMPORTS } from '../../../../shared/shared-imports';

@Component({
  selector: 'app-new-exercise',
  standalone: true,
  imports: [...SHARED_IMPORTS, AppSelectComponent],
  templateUrl: './new-exercise.component.html',
  styleUrls: ['./new-exercise.component.css'],
})
export class NewExerciseComponent implements OnInit {
  private readonly validateInputs = createInputValidationGuard();
  private readonly logger = inject(LoggerService);

  private readonly destroyRef = inject(DestroyRef);
  @Input()
  workoutId!: number;

  newExercise: Exercise = this.createEmptyExercise();

  saving = false;

  message = '';

  messageParams: Record<string, unknown> = {};
  messageType: 'success' | 'error' | '' = '';

  constructor(
    private exercisesService: ExerciseService,
  ) {}

  // =============================
  // INIT
  // =============================

  ngOnInit(): void {
    if (!this.workoutId) {
      this.showError('newExercise.workoutIdRequired');
    }

  }

  // =============================
  // EXERCISE LÉTREHOZÁS
  // =============================

  addExercise(): void {
    if (!this.validateInputs()) return;
    this.clearMessage();

    this.saving = true;

    const payload = {
      name: this.newExercise.name,
      description: this.newExercise.description,
      imageUrl: this.newExercise.imageUrl,
      videoUrl: this.newExercise.videoUrl,
      muscleGroup: this.newExercise.muscleGroup,
      equipment: this.newExercise.equipment,
      difficultyLevel: this.newExercise.difficultyLevel,
      category: this.newExercise.category,
      caloriesBurnedPerMinute: this.newExercise.caloriesBurnedPerMinute,
      durationSeconds: this.newExercise.durationSeconds,
    };

    this.exercisesService.addExercise(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.saving = false;

        if (!res.success) {
          this.showError(responseMessage([res], 'newExercise.error')); return;
        }
        this.showSuccess(responseMessage([res], 'newExercise.success'));
        this.messageParams = res.message ? {} : { name: this.newExercise.name };

        this.newExercise = this.createEmptyExercise();
      },

      error: (err: HttpErrorResponse) => {
        this.saving = false;

        this.logger.error('Exercise creation error:', err);

        this.handleError(err);
      },
    });
  }

  // =============================
  // ERROR KEZELÉS
  // =============================

  private handleError(err: HttpErrorResponse): void {
    this.showError(errorMessage(err, 'newExercise.error'));
  }

  // =============================
  // ÜRES EXERCISE
  // =============================

  private createEmptyExercise(): Exercise {
    return {
      name: '',
      description: '',
      imageUrl: '',
      videoUrl: '',
      muscleGroup: '',
      equipment: '',
      difficultyLevel: '',
      category: '',
      caloriesBurnedPerMinute: 0,
      durationSeconds: 0,
      done: false,
    };
  }

  // =============================
  // MESSAGE SEGÉDMETÓDUSOK
  // =============================

  private showSuccess(message: string): void {
    this.message = message;

    this.messageType = 'success';
  }

  private showError(message: string): void {
    this.message = message;

    this.messageType = 'error';
  }

  private clearMessage(): void {
    this.message = '';
    this.messageParams = {};
    this.messageType = '';
  }
}
