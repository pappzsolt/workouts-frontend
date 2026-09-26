import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

import { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';
import { LanguageService } from '../../../../../services/shared/language.service';
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
  private readonly destroyRef = inject(DestroyRef);
  @Input()
  workoutId!: number;

  newExercise: Exercise = this.createEmptyExercise();

  saving = false;

  message = '';

  messageType: 'success' | 'error' | '' = '';

  constructor(
    private exercisesService: ExerciseService,
    private translate: TranslateService,
    private languageService: LanguageService,
  ) {}

  // =============================
  // INIT
  // =============================

  ngOnInit(): void {
    if (!this.workoutId) {
      this.showError(this.translate.instant('newExercise.workoutIdRequired'));
    }

    this.languageService.language$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.refreshMessage();
    });
  }

  // =============================
  // NYELVVÁLTÁS
  // =============================

  private refreshMessage(): void {
    /*
     * Ha nincs üzenet,
     * nincs mit frissíteni.
     */
    if (!this.message) {
      return;
    }

    /*
     * A konkrét hiba/siker üzenet paramétereket is
     * tartalmazhat, ezért itt nem tudjuk biztonságosan
     * ugyanazt az üzenetet újra előállítani.
     *
     * Ezért nyelvváltáskor töröljük.
     */
    this.clearMessage();
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
            name: this.newExercise.name,
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
