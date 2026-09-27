import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Subject, catchError, concatMap, from, of, takeUntil, timer, toArray } from 'rxjs';

import { MessageComponent } from '../../../shared/components/message/message.component';
import { CoachProgramBoardComponent } from '../../../shared/coach/coach-program-board/coach-program-board.component';
import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';

import { Workout } from '../../../../models/workout.model';
import { CoachProgram } from '../../../../models/coach-program.model';

import { ProgramWorkoutService } from '../../../../services/coach/program-workout.service';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-program-workouts-ass',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MessageComponent,
    CoachProgramBoardComponent,
    CoachWorkoutBoardComponent,
    AppIconComponent,
    TranslatePipe,
  ],
  templateUrl: './program-workouts-ass.component.html',
})
export class ProgramWorkoutsAssComponent implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  programs: CoachProgram[] = [];

  workouts: Workout[] = [];

  selectedProgramId?: number;

  selectedWorkoutIds: number[] = [];

  message: string | null = null;

  messageStatus: 'success' | 'error' | 'info' | '' = '';

  @Output()
  assignedWorkouts = new EventEmitter<{
    programId: number;
    workoutIds: number[];
  }>();

  constructor(private programWorkoutService: ProgramWorkoutService) {}

  // ==========================================================
  // PROGRAM SELECTION
  // ==========================================================

  onProgramSelected(programId: number): void {
    this.selectedProgramId = programId;
    this.selectedWorkoutIds = [];
  }

  // ==========================================================
  // WORKOUT SELECTION
  // ==========================================================

  onWorkoutsChange(updatedIds: number[]): void {
    if (!this.selectedProgramId) {
      this.message = 'programWorkouts.programNotSelected';
      this.messageStatus = 'error';
      return;
    }

    this.selectedWorkoutIds = [...updatedIds];

    this.assignedWorkouts.emit({
      programId: this.selectedProgramId,
      workoutIds: this.selectedWorkoutIds,
    });
  }

  // ==========================================================
  // SAVE WORKOUTS
  // ==========================================================

  saveSelectedWorkouts(): void {
    const selectedProgramId = this.selectedProgramId;

    if (!selectedProgramId) {
      this.message = 'programWorkouts.programNotSelected';
      this.messageStatus = 'error';
      return;
    }

    if (this.selectedWorkoutIds.length === 0) {
      this.message = 'programWorkouts.noWorkoutsSelected';
      this.messageStatus = 'error';
      return;
    }

    const requests = this.selectedWorkoutIds.map((workoutId, index) => ({
      workoutId,
      dayIndex: index + 1,
    }));

    from(requests)
      .pipe(
        concatMap(({ workoutId, dayIndex }) =>
          this.programWorkoutService
            .addWorkoutToProgram(selectedProgramId, workoutId, dayIndex)
            .pipe(
              catchError((err) =>
                of({
                  success: false,
                  data: null,
                  message: err.error?.message || 'programWorkouts.unknownError',
                }),
              ),
            ),
        ),
        toArray(),
        takeUntil(this.destroy$),
      )
      .subscribe((results) => {
        const failed = results.filter((result) => !result.success);

        if (failed.length > 0) {
          this.message = failed.map((result) => result.message || 'programWorkouts.unknownError').join(' ');
          this.messageStatus = 'error';
          return;
        }

        this.message = results[results.length - 1]?.message || 'programWorkouts.assignSuccess';
        this.messageStatus = 'success';

        timer(5000)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.message = null;
            this.messageStatus = '';
          });
      });
  }


  // ==========================================================
  // REMOVE WORKOUT
  // ==========================================================

  removeWorkout(wid: number): void {
    if (!this.selectedProgramId) {
      this.message = 'programWorkouts.programNotSelected';
      this.messageStatus = 'error';
      return;
    }

    this.programWorkoutService.deleteProgramWorkout(this.selectedProgramId, wid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (res) => {
        if (!res.success) {
          this.message = res.message || 'programWorkouts.unknownError';
          this.messageStatus = 'error';
          return;
        }

        this.selectedWorkoutIds = this.selectedWorkoutIds.filter((id) => id !== wid);
        this.message = res.message;
        this.messageStatus = 'success';

        this.onWorkoutsChange(this.selectedWorkoutIds);

        timer(5000)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.message = null;
            this.messageStatus = '';
          });
      },

      error: (err) => {
        this.message = err.error?.message || 'programWorkouts.unknownError';
        this.messageStatus = 'error';
      },
    });
  }

\n\n  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}