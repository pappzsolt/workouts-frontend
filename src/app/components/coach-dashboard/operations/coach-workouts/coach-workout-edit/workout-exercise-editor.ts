import type { DestroyRef } from '@angular/core';
import type { Router } from '@angular/router';
import { takeUntil } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { HttpErrorResponse } from '@angular/common/http';
import type { WorkoutExerciseView } from '../../../../../models/workout/workout-exercise-view.model';
import type { ApiResponse } from '../../../../../models/backend-dto/common/api-response';
import type { Exercise, WorkoutWithExercises as WorkoutUiDto } from '../../../../../models/exercise.model';
import type { WorkoutExerciseService } from '../../../../../services/coach/workout-exercises.service';
import type { CoachWorkspaceService } from '../../../../../services/coach/coach-workspace.service';
import type { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';
import type { ProgramWorkoutService } from '../../../../../services/coach/program-workout.service';
import type { LanguageService } from '../../../../../services/shared/language.service';
import type { LoggerService } from '../../../../../services/logger.service';
import { containsExercise, selectableExercises, toWorkoutExerciseViews } from './workout-edit.helpers';
import type { WorkoutEditorState } from './workout-editor-state';
import type { WorkoutEditorEffects } from './workout-editor-effects';

/** Catalogue, assignment lock, exercise mutations and template copies. */
export class WorkoutExerciseEditor {
  constructor(
    private readonly state: WorkoutEditorState,
    private readonly workoutExerciseService: WorkoutExerciseService,
    private readonly workspace: CoachWorkspaceService,
    private readonly exerciseService: ExerciseService,
    private readonly programWorkoutService: ProgramWorkoutService,
    private readonly languageService: LanguageService,
    private readonly logger: LoggerService,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef,
    private readonly effects: WorkoutEditorEffects,
  ) {}

  checkProgramAssignment(): void {
    if (!this.state.workoutId) return;
    this.state.assignmentLoadCancelled$.next();
    this.state.assignmentVerified = false;
    this.state.checkingProgramAssignment = true;
    this.programWorkoutService.isWorkoutAssignedToAnyProgram(this.state.workoutId)
      .pipe(takeUntil(this.state.assignmentLoadCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (response) => {
          this.state.assignmentVerified = response.success && typeof response.data?.assigned === 'boolean';
          this.state.workoutAssignedToProgram = response.data?.assigned === true;
          if (!this.state.assignmentVerified) this.effects.setMessage('coachWorkoutEdit.loadError', 'error');
          this.state.checkingProgramAssignment = false;
        },
        error: (error: HttpErrorResponse) => {
          this.logger.error('Hiba a workout programhoz tartozásának ellenőrzésekor:', error);
          this.state.assignmentVerified = false;
          this.effects.setMessage('coachWorkoutEdit.loadError', 'error');
          this.state.checkingProgramAssignment = false;
        },
      });
  }

  loadExercises(): void {
    this.state.exercisesLoadCancelled$.next();
    this.state.loadingExercises = true;
    this.exerciseService.getAllExercises()
      .pipe(takeUntil(this.state.exercisesLoadCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (response: ApiResponse<Exercise[]>) => {
          this.state.exercises = response.data ?? [];
          this.state.loadingExercises = false;
        },
        error: (error) => {
          this.logger.error('Hiba az exercise-ek betöltésekor:', error);
          this.state.exercises = [];
          this.state.loadingExercises = false;
          this.effects.setMessage('coachWorkoutEdit.loadExercisesError', 'error');
        },
      });
  }

  loadWorkoutExercises(): void {
    if (!this.state.workoutId) return;
    this.state.workoutExercisesLoadCancelled$.next();
    this.exerciseService.getWorkoutExercises(this.state.workoutId)
      .pipe(takeUntil(this.state.workoutExercisesLoadCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (workout: WorkoutUiDto) => {
          this.state.workoutExercises = toWorkoutExerciseViews(workout, this.state.workoutId!);
        },
        error: (error: HttpErrorResponse) => {
          this.logger.error('Hiba a workout exercise-ek betöltésekor:', error);
          this.state.workoutExercises = [];
          this.effects.setMessage('coachWorkoutEdit.loadWorkoutExercisesError', 'error');
        },
      });
  }

  loadUsage(): void {
    if (!this.state.workoutId) return;
    this.workspace.programsUsingWorkout(this.state.workoutId).pipe(takeUntil(this.state.contextCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (programs) => (this.state.usedInPrograms = programs),
      error: () => (this.state.usedInPrograms = []),
    });
  }

  isExerciseAlreadyAdded(exerciseId: number): boolean {
    return containsExercise(this.state.workoutExercises, exerciseId);
  }

  selectExercise(exerciseId: number | undefined): void {
    if (exerciseId == null || !this.state.canEditStructure) return;
    if (this.state.workoutAssignedToProgram) {
      this.effects.setMessage('coachWorkoutEdit.workoutAssigned', 'error');
      return;
    }
    this.state.selectedExerciseId = exerciseId;
  }

  getSelectedExerciseName(): string {
    if (this.state.selectedExerciseId == null) return '';
    return this.state.exercises.find((exercise) => Number(exercise.id) === Number(this.state.selectedExerciseId))?.name || '';
  }

  onExerciseSearchChange(term: string): void {
    this.state.exerciseSearchTerm = term;
    if (!term) this.state.selectedExerciseId = null;
  }

  get availableExercises(): Exercise[] {
    if (!this.state.canEditStructure) return [];
    return selectableExercises(this.state.exercises, this.state.workoutExercises, this.state.exerciseSearchTerm,
      this.languageService.getCurrentLanguage());
  }

  addExerciseToWorkout(): void {
    if (!this.state.workoutId) {
      this.effects.setMessage('coachWorkoutEdit.invalidWorkoutId', 'error');
      return;
    }
    // Megvárjuk a programhoz tartozás ellenőrzését; a backend ettől függetlenül is véd.
    if (!this.state.canEditStructure || this.state.addingExercise || this.state.structureBusy) return;
    if (this.state.workoutAssignedToProgram) {
      this.effects.setMessage('coachWorkoutEdit.workoutAssigned', 'error');
      return;
    }
    if (!this.state.selectedExerciseId) {
      this.effects.setMessage('coachWorkoutEdit.selectExercise', 'error');
      return;
    }
    if (this.isExerciseAlreadyAdded(this.state.selectedExerciseId)) {
      this.effects.setMessage('coachWorkoutEdit.exerciseAlreadyAdded', 'error');
      return;
    }

    const exerciseId = this.state.selectedExerciseId;
    const workoutId = this.state.workoutId;
    this.state.addingExercise = true;
    this.workoutExerciseService.assignExerciseToWorkout(workoutId, exerciseId).pipe(takeUntil(this.state.contextCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const addedExercise = this.state.exercises.find((exercise) => Number(exercise.id) === Number(exerciseId));
        // A backend nem küldi vissza az új kapcsolatot: a listába a szükséges adatok kerülnek.
        if (addedExercise && !this.isExerciseAlreadyAdded(exerciseId)) {
          this.state.workoutExercises.push({
            workoutId,
            exerciseId: addedExercise.id,
            exercise: addedExercise,
            sets: addedExercise.sets ?? 0,
            repetitions: addedExercise.repetitions ?? 0,
            orderIndex: this.state.workoutExercises.length,
            restSeconds: 0,
            done: false,
          });
        }
        this.state.selectedExerciseId = null;
        this.state.addingExercise = false;
        this.effects.setMessage('coachWorkoutEdit.addSuccess', 'success');
      },
      error: (error: HttpErrorResponse) => {
        this.logger.error('Hiba az exercise workoutba adásakor:', error);
        this.state.addingExercise = false;
        const backendMessage = error?.error?.message ?? error?.error?.error ?? error?.message;
        this.effects.setMessage(backendMessage || 'coachWorkoutEdit.addError', 'error');
      },
    });
  }

  copyForEditing(): void {
    if (!this.state.workoutId || this.state.copying) return;
    this.state.copying = true;
    const name = `${this.state.workout?.name ?? ''} (2)`.trim();
    this.workspace.copyWorkout(this.state.workoutId, name).pipe(takeUntil(this.state.contextCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (id) => {
        this.state.copying = false;
        void this.router.navigate(['/coach/workouts', id, 'edit']);
      },
      error: (error: HttpErrorResponse) => {
        this.state.copying = false;
        this.effects.setMessage(error?.error?.message || error?.message || 'coachWorkoutEdit.copyError', 'error');
      },
    });
  }

  removeExercise(view: WorkoutExerciseView): void {
    const exerciseId = view.exerciseId ?? view.exercise?.id;
    if (!this.state.workoutId || exerciseId == null || !this.state.canEditStructure || this.state.structureBusy || this.state.addingExercise) return;
    this.state.structureBusy = true;
    this.workoutExerciseService.deleteExerciseFromWorkout(this.state.workoutId, exerciseId).pipe(takeUntil(this.state.contextCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.state.structureBusy = false;
        if (!res.success) {
          this.effects.setMessage(res.message || 'coachWorkoutEdit.removeExerciseError', 'error');
          return;
        }
        this.effects.setMessage('coachWorkoutEdit.exerciseRemoved', 'success');
        this.effects.loadWorkoutExercises();
      },
      error: (error: HttpErrorResponse) => {
        this.state.structureBusy = false;
        this.effects.setMessage(error?.error?.message || 'coachWorkoutEdit.removeExerciseError', 'error');
      },
    });
  }

  moveExercise(index: number, direction: -1 | 1): void {
    const a = this.state.workoutExercises[index];
    const b = this.state.workoutExercises[index + direction];
    if (!this.state.workoutId || !a || !b || !this.state.canEditStructure || this.state.structureBusy || this.state.addingExercise) return;
    const exerciseId = a.exerciseId ?? a.exercise?.id;
    const targetIndex = b.orderIndex ?? index + direction;
    if (exerciseId == null) return;
    this.state.structureBusy = true;
    this.workoutExerciseService.updateOrderIndex(this.state.workoutId, exerciseId, targetIndex).pipe(takeUntil(this.state.contextCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.state.structureBusy = false;
        if (!res.success) this.effects.setMessage(res.message || 'coachWorkoutEdit.reorderError', 'error');
        this.effects.loadWorkoutExercises();
      },
      error: (error: HttpErrorResponse) => {
        this.state.structureBusy = false;
        this.effects.setMessage(error?.error?.message || 'coachWorkoutEdit.reorderError', 'error');
        this.effects.loadWorkoutExercises();
      },
    });
  }
}
