import { Component, Input, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

import { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';
import { Exercise } from '../../../../../models/exercise.model';

import { SHARED_IMPORTS } from '../../../../shared/shared-imports';

@Component({
  selector: 'app-new-exercise',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './new-exercise.component.html',
  styleUrls: ['./new-exercise.component.css'],
})
export class NewExerciseComponent implements OnInit {
  @Input()
  workoutId!: number;

  newExercise: Exercise = this.createEmptyExercise();

  saving = false;

  message = '';

  messageType: 'success' | 'error' | '' = '';

  constructor(
    private exercisesService: ExerciseService,
    private translate: TranslateService,
  ) {}

  // =============================
  // INIT
  // =============================

  ngOnInit(): void {
    if (!this.workoutId) {
      this.showError(this.translate.instant('newExercise.workoutIdRequired'));
    }
  }

  // =============================
  // EXERCISE LÉTREHOZÁS
  // =============================

  addExercise(): void {
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

    this.exercisesService.addExercise(payload).subscribe({
      next: (res) => {
        this.saving = false;

        this.showSuccess(
          this.translate.instant('newExercise.success', {
            name: res.name,
          }),
        );

        this.newExercise = this.createEmptyExercise();
      },

      error: (err: HttpErrorResponse) => {
        this.saving = false;

        console.error('Exercise creation error:', err);

        this.handleError(err);
      },
    });
  }

  // =============================
  // ERROR KEZELÉS
  // =============================

  private handleError(err: HttpErrorResponse): void {
    if (err.error && typeof err.error === 'string') {
      this.showError(
        this.translate.instant('newExercise.errorWithMessage', {
          message: err.error,
        }),
      );

      return;
    }

    if (err.error && err.error.message) {
      this.showError(
        this.translate.instant('newExercise.errorWithMessage', {
          message: err.error.message,
        }),
      );

      return;
    }

    this.showError(
      this.translate.instant('newExercise.errorWithStatus', {
        status: err.status,
        statusText: err.statusText,
      }),
    );
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

    this.messageType = '';
  }
}
