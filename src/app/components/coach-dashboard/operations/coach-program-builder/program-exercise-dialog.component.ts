import { Component, Input, Output, EventEmitter, DestroyRef, OnChanges, SimpleChanges, inject } from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { errorMessage, responseMessage } from '../../../../models/backend-dto/common/api-response-message';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { CoachExercisesBoardComponent } from '../../../shared/coach/coach-exercises-board/coach-exercises-board.component';
import { CoachProgramBuilderWorkoutService } from '../../../../services/coach/coach-program-builder-workout.service';
import type { Exercise, WorkoutWithExercises, WorkoutExercise } from '../../../../models/exercise.model';

@Component({
  selector: 'app-program-exercise-dialog', standalone: true,
  imports: [...SHARED_IMPORTS, CoachExercisesBoardComponent],
  templateUrl: './program-exercise-dialog.component.html',
})
export class ProgramExerciseDialogComponent implements OnChanges {
  private readonly destroyRef = inject(DestroyRef);
  private readonly workoutBuilderService = inject(CoachProgramBuilderWorkoutService);
  @Input() workoutId: number | null = null;
  exerciseDialogWorkout: WorkoutWithExercises | null = null;
  @Input() exerciseDialogIsNewWorkout = false;
  exercises: Exercise[] = [];
  initialExercises: Exercise[] = [];
  selectedWorkoutExercises: WorkoutExercise[] = [];
  @Input() dayIndex = 1;
  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly workoutSaved = new EventEmitter<WorkoutWithExercises>();
  @Output() readonly saveSuccess = new EventEmitter<string>();
  @Output() readonly saveError = new EventEmitter<string>();
  exerciseDialogOpen = true;
  exerciseDialogExercises: Exercise[] = [];
  loadingExercises = false;
  errorMessage = '';

  private loadRequest?: Subscription;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['workoutId'] || this.workoutId === null) return;
    this.loadRequest?.unsubscribe();
    this.exerciseDialogWorkout = null;
    this.errorMessage = '';
    this.loadingExercises = true;
    this.loadRequest = forkJoin({
      workout: this.workoutBuilderService.getWorkoutExercises(this.workoutId),
      catalog: this.workoutBuilderService.loadExercises(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ workout, catalog }) => {
        if (!catalog.success || !Array.isArray(catalog.data)) {
          this.loadingExercises = false;
          this.reportSaveError(catalog.message || 'coachProgramBuilder.loadExercisesError');
          this.close.emit();
          return;
        }
        this.exerciseDialogWorkout = workout;
        this.selectedWorkoutExercises = workout.exercises ?? [];
        this.initialExercises = this.selectedWorkoutExercises.map(row => row.exercise);
        this.exerciseDialogExercises = [...this.initialExercises];
        this.exercises = catalog.data;
        this.loadingExercises = false;
      },
      error: error => {
        this.loadingExercises = false;
        this.reportSaveError(errorMessage(error, 'coachProgramBuilder.loadWorkoutExercisesError'));
        this.close.emit();
      },
    });
  }

  onExercisesChange(updatedExercises: Exercise[]): void {
    if (!this.exerciseDialogIsNewWorkout) {
      return;
    }

    this.exerciseDialogExercises = [...updatedExercises];
  }

  saveExerciseDialog(): void {
    if (this.loadingExercises) return;
    if (!this.exerciseDialogWorkout || !this.exerciseDialogIsNewWorkout) {
      this.close.emit();
      return;
    }

    const workoutId = this.exerciseDialogWorkout.id;

    this.errorMessage = '';
    this.loadingExercises = true;

    this.workoutBuilderService
      .saveExercises(workoutId, [...this.exerciseDialogExercises])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ results, workout }) => {
          this.exerciseDialogWorkout = workout;
          this.selectedWorkoutExercises = workout.exercises;
          const failed = results.filter((result) => !result.success);

          this.loadingExercises = false;

          if (failed.length > 0) {
            this.reportSaveError(responseMessage(results, 'coachProgramBuilder.saveExerciseError'));
            return;
          }

          this.saveSuccess.emit(responseMessage(results, 'coachProgramBuilder.saveExerciseSuccess'));
          this.workoutSaved.emit(workout);
          this.close.emit();
        },
        error: error => {
          this.loadingExercises = false;
          this.reportSaveError(errorMessage(error, 'coachProgramBuilder.saveExerciseError'));
        },
      });
  }

  private reportSaveError(message: string): void {
    this.errorMessage = message;
    this.saveError.emit(message);
  }
}
