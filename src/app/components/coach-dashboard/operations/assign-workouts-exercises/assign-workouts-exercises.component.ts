import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';
import { CoachExercisesBoardComponent } from '../../../shared/coach/coach-exercises-board/coach-exercises-board.component';

import { Workout } from '../../../../models/workout.model';
import { Exercise } from '../../../../models/exercise.model';
import { WorkoutExerciseService } from '../../../../services/coach/workout-exercises.service';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-assign-workouts-exercises',
  standalone: true,
  imports: [...SHARED_IMPORTS, CoachWorkoutBoardComponent, CoachExercisesBoardComponent],
  styleUrl: './assign-workouts-exercises.component.css',
  templateUrl: './assign-workouts-exercises.component.html',
})
export class AssignWorkoutsExercisesComponent implements OnInit {
  workouts: Workout[] = [];
  exercises: Exercise[] = [];

  selectedWorkoutIds: number[] = [];
  selectedExercises: Exercise[] = [];

  message = '';
  messageType: 'success' | 'error' | '' = '';

  @Output() assignedWorkouts = new EventEmitter<number[]>();
  @Output() assignedExercises = new EventEmitter<Exercise[]>();

  constructor(private workoutExerciseService: WorkoutExerciseService) {}

  ngOnInit(): void {}

  onWorkoutsChange(updatedIds: number[]): void {
    const previousSelectedWorkouts = [...this.selectedWorkoutIds];

    this.selectedWorkoutIds = [...updatedIds];

    this.message = '';
    this.messageType = '';

    if (JSON.stringify(previousSelectedWorkouts) !== JSON.stringify(this.selectedWorkoutIds)) {
      this.selectedExercises = [];
      this.assignedExercises.emit(this.selectedExercises);
    }

    console.log('Selected workouts:', this.selectedWorkoutIds);

    this.assignedWorkouts.emit(this.selectedWorkoutIds);
  }

  onExercisesChange(updatedExercises: Exercise[]): void {
    this.selectedExercises = [...updatedExercises];

    this.message = '';
    this.messageType = '';

    console.log('Selected exercises:', this.selectedExercises);

    this.assignedExercises.emit(this.selectedExercises);
  }

  removeWorkout(wid: number): void {
    this.selectedWorkoutIds = this.selectedWorkoutIds.filter((id) => id !== wid);

    this.onWorkoutsChange(this.selectedWorkoutIds);
  }

  removeExercise(eid: number): void {
    this.selectedExercises = this.selectedExercises.filter((e) => e.id !== eid);

    this.onExercisesChange(this.selectedExercises);
  }

  saveSelectedWorkoutsAndExercises(): void {
    this.message = '';
    this.messageType = '';

    if (this.selectedWorkoutIds.length === 0) {
      this.message = 'Válassz ki legalább egy workoutot.';
      this.messageType = 'error';
      return;
    }

    if (this.selectedExercises.length === 0) {
      this.message = 'Válassz ki legalább egy exercise-t.';
      this.messageType = 'error';
      return;
    }

    console.log('🚀 Mentés backendhez:', {
      workouts: this.selectedWorkoutIds,
      exercises: this.selectedExercises,
    });

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
      this.message = 'Nincs menthető exercise.';
      this.messageType = 'error';
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

            console.log('Mentés sikeres:', res);

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

            console.error('Mentés hiba:', err);
            console.error('Backend válasz:', err.error);

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

  private finishSave(
    successCount: number,
    errorCount: number,
    successes: string[],
    errors: string[],
  ): void {
    console.log('Mentés befejezve:', {
      successCount,
      errorCount,
      successes,
      errors,
    });

    if (errorCount === 0) {
      this.message = successes[0] || 'Az exercise-ek sikeresen hozzárendelésre kerültek.';
      this.messageType = 'success';
      return;
    }

    if (successCount === 0) {
      this.message = errors.join(' ');
      this.messageType = 'error';
      return;
    }

    this.message = [
      `Sikeres mentések: ${successCount}.`,
      `Hibás mentések: ${errorCount}.`,
      ...errors,
    ].join(' ');

    this.messageType = 'error';
  }
}
