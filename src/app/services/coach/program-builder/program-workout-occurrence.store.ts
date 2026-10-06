import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { CoachProgramBuilderWorkoutService } from '../coach-program-builder-workout.service';
import { ProgramWorkoutState } from '../../../models/program-workout-state';
import type { WorkoutWithExercises } from '../../../models/exercise.model';

/** Owns occurrence loading and mutations. Picker and dialogs keep only transient UI state. */
@Injectable()
export class ProgramWorkoutOccurrenceStore {
  private readonly api = inject(CoachProgramBuilderWorkoutService);
  private readonly destroyRef = inject(DestroyRef);
  private loadRequest?: Subscription;
  private mutationRequest?: Subscription;
  state = new ProgramWorkoutState();
  workouts: WorkoutWithExercises[] = [];
  loading = false;
  busy = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  private programId: number | null = null;

  load(programId: number | null, loaded?: () => void): void {
    if (this.busy && this.programId === programId) return;
    this.loadRequest?.unsubscribe();
    if (this.programId !== programId) {
      this.mutationRequest?.unsubscribe();
      this.busy = false;
      this.message = '';
      this.state = new ProgramWorkoutState();
      this.workouts = [];
    }
    this.programId = programId;
    if (programId === null) { this.loading = false; return; }
    this.loading = true;
    this.loadRequest = this.api.loadProgramWorkouts(programId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => {
        this.state = result.state;
        this.workouts = result.allWorkouts;
        this.loading = false;
        loaded?.();
      },
      error: () => {
        this.state = new ProgramWorkoutState();
        this.workouts = [];
        this.loading = false;
        this.fail('coachProgramBuilder.loadProgramWorkoutsError');
      },
    });
  }

  add(ids: number[], completed: (addedIds: number[]) => void): void {
    if (this.busy || this.loading) return;
    if (this.programId === null || !ids.length) { this.fail('coachProgramBuilder.addWorkoutError'); return; }
    this.loadRequest?.unsubscribe();
    this.loading = false;
    this.busy = true;
    this.mutationRequest = this.api.addWorkouts(this.programId, [...ids], this.state.nextDayIndex).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: results => {
        this.busy = false;
        const failed = results.filter(result => !result.success);
        if (failed.length) this.fail(failed.map(result => result.message || 'coachProgramBuilder.addWorkoutError').join(' '));
        else this.success('coachProgramBuilder.addedToProgram');
        const added = results.flatMap(result => result.success && result.data ? [result.data] : []);
        this.state.load([...this.state.assignments, ...added], this.workouts);
        completed(added.map(row => row.workoutId));
      },
      error: error => { this.busy = false; this.fail(error?.error?.message || 'coachProgramBuilder.addWorkoutError'); },
    });
  }

  remove(id: number): void {
    if (this.busy || this.loading) return;
    if (!this.state.assignments.some(row => row.id === id)) { this.fail('coachProgramBuilder.removeWorkoutError'); return; }
    this.loadRequest?.unsubscribe();
    this.loading = false;
    this.busy = true;
    this.mutationRequest = this.api.removeWorkout(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.busy = false;
        if (!response.success) { this.fail(response.message || 'coachProgramBuilder.removeWorkoutError'); return; }
        this.state.remove(id);
      },
      error: error => { this.busy = false; this.fail(error?.error?.message || 'coachProgramBuilder.removeWorkoutError'); },
    });
  }

  updateDay(id: number, dayIndex: number): void {
    if (this.busy || this.loading) return;
    if (!this.state.assignments.some(row => row.id === id)) { this.fail('coachProgramBuilder.updateWorkoutDayError'); return; }
    this.loadRequest?.unsubscribe();
    this.loading = false;
    this.busy = true;
    this.mutationRequest = this.api.updateWorkoutDay(id, dayIndex).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.busy = false;
        if (!response.success || !response.data) { this.fail(response.message || 'coachProgramBuilder.updateWorkoutDayError'); return; }
        try { this.state.update(response.data); }
        catch { this.fail('coachProgramBuilder.updateWorkoutDayError'); }
      },
      error: error => { this.busy = false; this.fail(error?.error?.message || 'coachProgramBuilder.updateWorkoutDayError'); },
    });
  }

  dayIndex(id: number | null): number {
    return this.state.assignments.find(row => row.id === id)?.dayIndex ?? 1;
  }
  fail(message: string): void { this.message = message; this.messageType = 'error'; }
  success(message: string): void { this.message = message; this.messageType = 'success'; }
}
