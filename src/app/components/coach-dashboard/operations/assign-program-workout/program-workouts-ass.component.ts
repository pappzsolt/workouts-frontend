import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Subject, catchError, concatMap, forkJoin, from, of, takeUntil, timer, toArray } from 'rxjs';

import { MessageComponent } from '../../../shared/components/message/message.component';
import { CoachProgramBoardComponent } from '../../../shared/coach/coach-program-board/coach-program-board.component';
import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';

import { Workout } from '../../../../models/workout.model';
import { CoachProgram } from '../../../../models/coach-program.model';
import type { ProgramWorkoutAssignment } from '../../../../models/program-workout-assignment.model';

import { ProgramWorkoutService } from '../../../../services/coach/program-workout.service';
import { CoachProgramSelectService } from '../../../../services/coach/coach-program-select/coach-program-select.service';
import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';
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
export class ProgramWorkoutsAssComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  programs: CoachProgram[] = [];

  workouts: Workout[] = [];

  selectedProgramId?: number;

  selectedWorkoutIds: number[] = [];

  private programWorkoutAssignments: ProgramWorkoutAssignment[] = [];

  message: string | null = null;

  messageStatus: 'success' | 'error' | 'info' | '' = '';

  @Output()
  assignedWorkouts = new EventEmitter<{
    programId: number;
    workoutIds: number[];
  }>();

  constructor(
    private programWorkoutService: ProgramWorkoutService,
    private coachProgramSelectService: CoachProgramSelectService,
    private coachWorkoutsService: CoachWorkoutsService,
  ) {}

  ngOnInit(): void {
    this.loadBoardData();
  }

  private loadBoardData(): void {
    forkJoin({
      programs: this.coachProgramSelectService.getMyPrograms(),
      workouts: this.coachWorkoutsService.getMyWorkouts(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ programs, workouts }) => {
          this.programs = programs.data ?? [];
          this.workouts = workouts.data ?? [];
        },
        error: () => {
          this.programs = [];
          this.workouts = [];
          this.message = 'programWorkouts.loadError';
          this.messageStatus = 'error';
        },
      });
  }

  // ==========================================================
  // PROGRAM SELECTION
  // ==========================================================

  onProgramSelected(programId: number): void {
    this.selectedProgramId = programId;
    this.selectedWorkoutIds = [];
    this.programWorkoutAssignments = [];

    this.programWorkoutService
      .getWorkoutsForProgram(programId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.message = response.message || 'programWorkouts.loadError';
            this.messageStatus = 'error';
            return;
          }

          this.programWorkoutAssignments = response.data ?? [];

          this.selectedWorkoutIds = Array.from(
            new Set(
              this.programWorkoutAssignments
                .map((assignment) => assignment.workoutId)
                .filter((id): id is number => Number.isInteger(id) && id > 0),
            ),
          );
        },
        error: (error) => {
          this.message = error.error?.message || 'programWorkouts.loadError';
          this.messageStatus = 'error';
        },
      });
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

    const occurrences = this.programWorkoutAssignments.filter(
      (assignment) => assignment.workoutId === wid,
    );

    if (occurrences.length === 0) {
      this.message = 'programWorkouts.unknownError';
      this.messageStatus = 'error';
      return;
    }

    from(occurrences)
      .pipe(
        concatMap((assignment) =>
          this.programWorkoutService.deleteProgramWorkout(assignment.id),
        ),
        toArray(),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (responses) => {
          const failed = responses.find((response) => !response.success);

          if (failed) {
            this.message = failed.message || 'programWorkouts.unknownError';
            this.messageStatus = 'error';
            return;
          }

          this.programWorkoutAssignments = this.programWorkoutAssignments.filter(
            (assignment) => assignment.workoutId !== wid,
          );
          this.selectedWorkoutIds = this.selectedWorkoutIds.filter((id) => id !== wid);
          this.message = responses.at(-1)?.message ?? 'programWorkouts.assignSuccess';
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}