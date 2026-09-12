import { Component, EventEmitter, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';
import { CoachExercisesBoardComponent } from '../../../shared/coach/coach-exercises-board/coach-exercises-board.component';

import { MessageComponent } from '../../../shared/message/message.component';

import { Workout } from '../../../../models/workout.model';
import { Exercise } from '../../../../models/exercise.model';

import { WorkoutExerciseService } from '../../../../services/coach/workout-exercises.service';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-assign-workouts-exercises',
  standalone: true,
  imports: [
    ...SHARED_IMPORTS,
    CoachWorkoutBoardComponent,
    CoachExercisesBoardComponent,
    MessageComponent,
  ],
  styleUrl: './assign-workouts-exercises.component.css',
  templateUrl: './assign-workouts-exercises.component.html',
})
export class AssignWorkoutsExercisesComponent {
  workouts: Workout[] = [];

  exercises: Exercise[] = [];

  selectedWorkoutIds: number[] = [];

  selectedExercises: Exercise[] = [];

  // =============================
  // ÜZENET
  // =============================

  message = '';

  messageType: 'success' | 'error' | 'info' | '' = '';

  // =============================
  // OUTPUT
  // =============================

  @Output()
  assignedWorkouts = new EventEmitter<number[]>();

  @Output()
  assignedExercises = new EventEmitter<Exercise[]>();

  constructor(private workoutExerciseService: WorkoutExerciseService) {}

  // =============================
  // WORKOUT KIVÁLASZTÁS
  // =============================

  onWorkoutsChange(updatedIds: number[]): void {
    const previousSelectedWorkouts = [...this.selectedWorkoutIds];

    this.selectedWorkoutIds = [...updatedIds];

    this.clearMessage();

    if (JSON.stringify(previousSelectedWorkouts) !== JSON.stringify(this.selectedWorkoutIds)) {
      this.selectedExercises = [];

      this.assignedExercises.emit(this.selectedExercises);
    }

    this.assignedWorkouts.emit(this.selectedWorkoutIds);
  }

  // =============================
  // EXERCISE KIVÁLASZTÁS
  // =============================

  onExercisesChange(updatedExercises: Exercise[]): void {
    this.selectedExercises = [...updatedExercises];

    this.clearMessage();

    this.assignedExercises.emit(this.selectedExercises);
  }

  // =============================
  // WORKOUT ELTÁVOLÍTÁS
  // =============================

  removeWorkout(wid: number): void {
    this.selectedWorkoutIds = this.selectedWorkoutIds.filter((id) => id !== wid);

    this.onWorkoutsChange(this.selectedWorkoutIds);
  }

  // =============================
  // EXERCISE ELTÁVOLÍTÁS
  // =============================

  removeExercise(eid: number): void {
    this.selectedExercises = this.selectedExercises.filter((exercise) => exercise.id !== eid);

    this.onExercisesChange(this.selectedExercises);
  }

  // =============================
  // MENTÉS
  // =============================

  saveSelectedWorkoutsAndExercises(): void {
    this.clearMessage();

    if (this.selectedWorkoutIds.length === 0) {
      this.showError('Válassz ki legalább egy workoutot.');

      return;
    }

    if (this.selectedExercises.length === 0) {
      this.showError('Válassz ki legalább egy exercise-t.');

      return;
    }

    const requests: Array<{
      workoutId: number;
      exerciseId: number;
    }> = [];

    for (const workoutId of this.selectedWorkoutIds) {
      for (const exercise of this.selectedExercises) {
        if (exercise.id == null) {
          continue;
        }

        requests.push({
          workoutId,
          exerciseId: exercise.id,
        });
      }
    }

    if (requests.length === 0) {
      this.showError('Nincs menthető exercise.');

      return;
    }

    let completedRequests = 0;

    let successCount = 0;

    let errorCount = 0;

    const errors: string[] = [];

    const successes: string[] = [];

    for (const request of requests) {
      this.workoutExerciseService
        .addWorkoutExerciseSimple(request.workoutId, request.exerciseId)
        .subscribe({
          next: (res: any) => {
            completedRequests++;

            successCount++;

            const successMessage = res?.message || 'Exercise sikeresen hozzárendelve a workouthoz.';

            if (!successes.includes(successMessage)) {
              successes.push(successMessage);
            }

            if (completedRequests === requests.length) {
              this.finishSave(successCount, errorCount, successes, errors);
            }
          },

          error: (err: HttpErrorResponse) => {
            completedRequests++;

            errorCount++;

            const backendMessage = typeof err.error === 'string' ? err.error : err.error?.message;

            const errorMessage =
              backendMessage ||
              `Hiba történt az exercise hozzárendelése közben. HTTP ${err.status}`;

            if (!errors.includes(errorMessage)) {
              errors.push(errorMessage);
            }

            if (completedRequests === requests.length) {
              this.finishSave(successCount, errorCount, successes, errors);
            }
          },
        });
    }
  }

  // =============================
  // MENTÉS EREDMÉNYE
  // =============================

  private finishSave(
    successCount: number,
    errorCount: number,
    successes: string[],
    errors: string[],
  ): void {
    if (errorCount === 0) {
      this.showSuccess(successes[0] || 'Az exercise-ek sikeresen hozzárendelésre kerültek.');

      return;
    }

    if (successCount === 0) {
      this.showError(errors.join(' '));

      return;
    }

    this.showError(
      [`Sikeres mentések: ${successCount}.`, `Hibás mentések: ${errorCount}.`, ...errors].join(' '),
    );
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
