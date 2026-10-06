import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Subject, Subscription, concatMap, finalize, forkJoin, from, takeUntil, tap, toArray } from 'rxjs';

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

  programWorkoutAssignments: ProgramWorkoutAssignment[] = [];
  loadingAssignments = false;
  assignmentsReady = false;
  busy = false;
  private selectionRequest?: Subscription;

  get pendingWorkoutIds(): number[] {
    return this.selectedWorkoutIds.filter(id => !this.programWorkoutAssignments.some(row => row.workoutId === id));
  }

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
          if (!programs.success || !workouts.success) {
            this.message = 'programWorkouts.loadError'; this.messageStatus = 'error'; return;
          }
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
    if (this.busy) return;
    this.selectionRequest?.unsubscribe();
    this.loadingAssignments = true;
    this.assignmentsReady = false;
    this.message = null;
    this.selectedProgramId = programId;
    this.selectedWorkoutIds = [];
    this.programWorkoutAssignments = [];

    this.selectionRequest = this.programWorkoutService
      .getWorkoutsForProgram(programId)
      .pipe(finalize(() => { this.loadingAssignments = false; }), takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.message = response.message || 'programWorkouts.loadError';
            this.messageStatus = 'error';
            return;
          }

          this.programWorkoutAssignments = response.data ?? [];
          this.assignmentsReady = true;

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
    if (this.busy || this.loadingAssignments || !this.assignmentsReady) return;
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
    if (this.busy || this.loadingAssignments || !this.assignmentsReady || !this.selectedProgramId) return;
    const programId = this.selectedProgramId;
    const removed = this.programWorkoutAssignments.filter(row => !this.selectedWorkoutIds.includes(row.workoutId));
    const added = [...this.pendingWorkoutIds];
    let nextDay = Math.max(0, ...this.programWorkoutAssignments.map(row => row.dayIndex)) + 1;
    this.busy = true;
    this.message = null;
    from(removed).pipe(
      concatMap(row => this.programWorkoutService.deleteProgramWorkout(row.id).pipe(tap(response => {
        if (!response.success) throw new Error(response.message || 'programWorkouts.unknownError');
        this.programWorkoutAssignments = this.programWorkoutAssignments.filter(item => item.id !== row.id);
      }))),
      toArray(),
      concatMap(() => from(added).pipe(
        concatMap(workoutId => this.programWorkoutService.addWorkoutToProgram(programId, workoutId, nextDay).pipe(tap(response => {
          if (!response.success || !response.data) throw new Error(response.message || 'programWorkouts.unknownError');
          this.programWorkoutAssignments = [...this.programWorkoutAssignments, response.data];
          nextDay++;
        }))), toArray(),
      )),
      finalize(() => { this.busy = false; }), takeUntil(this.destroy$),
    ).subscribe({
      next: () => { this.message = 'programWorkouts.assignSuccess'; this.messageStatus = 'success'; },
      error: error => this.fail(error),
    });
  }

  removePendingWorkout(id: number): void {
    if (this.busy || this.loadingAssignments || !this.assignmentsReady) return;
    this.onWorkoutsChange(this.selectedWorkoutIds.filter(value => value !== id));
  }

  removeWorkout(assignmentId: number): void {
    if (this.busy || this.loadingAssignments || !this.assignmentsReady) return;
    const row = this.programWorkoutAssignments.find(item => item.id === assignmentId);
    if (!row) return;
    this.busy = true;
    this.message = null;
    this.programWorkoutService.deleteProgramWorkout(assignmentId).pipe(
      tap(response => {
        if (!response.success) throw new Error(response.message || 'programWorkouts.unknownError');
        this.programWorkoutAssignments = this.programWorkoutAssignments.filter(item => item.id !== assignmentId);
        if (!this.programWorkoutAssignments.some(item => item.workoutId === row.workoutId)) {
          this.onSelectionRemoved(row.workoutId);
        }
      }), finalize(() => { this.busy = false; }), takeUntil(this.destroy$),
    ).subscribe({
      next: () => { this.message = 'programWorkouts.assignSuccess'; this.messageStatus = 'success'; },
      error: error => this.fail(error),
    });
  }

  workoutName(id: number): string {
    return this.workouts.find(workout => workout.id === id)?.name ?? String(id);
  }

  private onSelectionRemoved(id: number): void {
    this.selectedWorkoutIds = this.selectedWorkoutIds.filter(value => value !== id);
    this.assignedWorkouts.emit({ programId: this.selectedProgramId!, workoutIds: [...this.selectedWorkoutIds] });
  }

  private fail(error: unknown): void {
    this.message = error instanceof HttpErrorResponse ? error.error?.message || 'programWorkouts.unknownError'
      : error instanceof Error ? error.message : 'programWorkouts.unknownError';
    this.messageStatus = 'error';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}