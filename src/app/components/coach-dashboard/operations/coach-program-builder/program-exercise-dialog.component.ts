import { Component, Input, Output, EventEmitter, DestroyRef, OnChanges, SimpleChanges, inject } from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  @Output() readonly saveError = new EventEmitter<string>();
  exerciseDialogOpen = true;
  exerciseDialogExercises: Exercise[] = [];
  exerciseAddDialogOpen = false;
  exerciseAddDialogExercises: Exercise[] = [];
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
      error: () => {
        this.loadingExercises = false;
        this.reportSaveError('coachProgramBuilder.loadWorkoutExercisesError');
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

  openExerciseAddDialog(): void {
    this.exerciseAddDialogExercises = [...this.exerciseDialogExercises];
    this.exerciseAddDialogOpen = true;
  }

  closeExerciseAddDialog(): void {
    this.exerciseAddDialogOpen = false;
    this.exerciseAddDialogExercises = [];
  }

  onExerciseAddDialogChange(updatedExercises: Exercise[]): void {
    this.exerciseAddDialogExercises = [...updatedExercises];
  }

  confirmExerciseAddDialog(): void {
    const selectedIds = new Set(
      this.exerciseAddDialogExercises.map((exercise) => exercise.id),
    );

    const addedExercises = this.exerciseAddDialogExercises.filter(
      (exercise) =>
        !this.exerciseDialogExercises.some(
          (selected) => selected.id === exercise.id,
        ),
    );

    const removedExercises = this.exerciseDialogExercises.filter(
      (exercise) => !selectedIds.has(exercise.id),
    );

    // Keep the existing business rule: an existing workout is read-only.
    if (!this.exerciseDialogIsNewWorkout) {
      this.closeExerciseAddDialog();
      return;
    }

    this.exerciseDialogExercises = [
      ...this.exerciseDialogExercises.filter(
        (exercise) => !removedExercises.some((removed) => removed.id === exercise.id),
      ),
      ...addedExercises,
    ];

    this.closeExerciseAddDialog();
  }

  saveExerciseDialog(): void {
    if (!this.exerciseDialogWorkout || !this.exerciseDialogIsNewWorkout) {
      this.close.emit();
      return;
    }

    const workoutId = this.exerciseDialogWorkout.id;

    const existingExerciseIds = new Set(
      this.selectedWorkoutExercises
        .map((workoutExercise) => workoutExercise.exercise?.id)
        .filter((id): id is number => id != null),
    );

    this.errorMessage = '';
    this.loadingExercises = true;

    this.workoutBuilderService
      .saveExercises(workoutId, this.exerciseDialogExercises, existingExerciseIds)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ results, workout }) => {
          const failed = results.filter((result) => !result.success);

          this.loadingExercises = false;

          if (failed.length > 0) {
            this.reportSaveError(failed.map((result) =>
              result.message || 'coachProgramBuilder.saveExerciseError').join(' '));
            return;
          }

          this.workoutSaved.emit(workout);
          this.close.emit();
        },
        error: () => {
          this.loadingExercises = false;
          this.reportSaveError('coachProgramBuilder.saveExerciseError');
        },
      });
  }

  private reportSaveError(message: string): void {
    this.errorMessage = message;
    this.saveError.emit(message);
  }
}
