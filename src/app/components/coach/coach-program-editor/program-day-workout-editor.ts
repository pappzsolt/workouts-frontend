import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { ProgramEditorState } from './program-editor-state';
import type { ProgramEditorEffects } from './program-editor-effects';
import type { Router } from '@angular/router';
import { concat, toArray, type Observable } from 'rxjs';
import { weeklyRepeat } from './program-days';

/** Shared exercise display and program-day scheduling actions. */
export class ProgramDayWorkoutEditor {
  get rows() { return this.state.selectedCell?.workout?.exercises ?? []; }
  moveDate = '';
  confirmRemove = false;
  extraDate = '';
  confirmRepeat = false;
  constructor(
    private readonly state: ProgramEditorState,
    private readonly workspace: CoachWorkspaceService,
    private readonly effects: ProgramEditorEffects,
    private readonly router: Router,
  ) {}

  openDay(day: number): void {
    this.confirmRemove = false;
    this.confirmRepeat = false;
    this.moveDate = this.state.planningStartDate ? this.state.dateForDay(day) : '';
    this.extraDate = this.state.planningStartDate ? this.state.dateForDay(Math.min(day + 7, this.state.cells.length || day)) : '';
  }

  private runDayAction(operation: Observable<unknown>, message: string, day: number, preserveDrafts = false): void {
    this.effects.run(operation, {
      success: () => { this.effects.showMessage(message, 'success'); this.effects.reload(day, preserveDrafts); },
      failure: error => { this.effects.showError(error, 'coachWorkspace.editor.actionError'); this.effects.reload(this.state.selectedDay, true); },
    });
  }

  moveWorkout(): void {
    if (this.state.operationPending) return;
    const link = this.state.selectedCell?.link;
    const target = this.state.dayForDate(this.moveDate);
    if (!link || !Number.isInteger(target) || target < 1 || target === link.dayIndex) return;
    if (target > this.state.cells.length) {
      this.effects.showMessage('coachWorkspace.editor.dayOutOfRange', 'error');
      return;
    }
    this.runDayAction(this.workspace.moveWorkoutToDay(link.id, target), 'coachWorkspace.editor.moved', target);
  }

  removeWorkout(): void {
    if (this.state.operationPending) return;
    const link = this.state.selectedCell?.link;
    if (!link) return;
    this.confirmRemove = false;
    this.runDayAction(this.workspace.removeWorkoutFromDay(link.id), 'coachWorkspace.editor.removed', this.state.selectedDay);
  }

  get weeklyRepeatDays(): number[] {
    return weeklyRepeat(this.state.cells, this.state.selectedDay).days;
  }

  get weeklyRepeatSkipped(): number {
    return weeklyRepeat(this.state.cells, this.state.selectedDay).skipped;
  }

  repeatWeekly(): void {
    const workout = this.state.selectedCell?.workout;
    const days = this.weeklyRepeatDays;
    if (this.state.programId === null || !workout || days.length === 0 || this.state.operationPending) return;
    const programId = this.state.programId;
    this.confirmRepeat = false;
    this.runDayAction(
      concat(...days.map((day) => this.workspace.addWorkoutToDay(programId, workout.workoutId, day))).pipe(toArray()),
      'coachWorkspace.editor.repeated',
      this.state.selectedDay,
      true,
    );
  }

  addToAnotherDay(): void {
    const workout = this.state.selectedCell?.workout;
    const target = this.state.dayForDate(this.extraDate);
    if (this.state.programId === null || !workout || this.state.operationPending) return;
    if (!Number.isInteger(target) || target < 1 || target > this.state.cells.length) {
      this.effects.showMessage('coachWorkspace.editor.dayOutOfRange', 'error');
      return;
    }
    if (this.state.cells[target - 1]?.link) {
      this.effects.showMessage('coachWorkspace.editor.dayTaken', 'error');
      return;
    }
    this.runDayAction(
      this.workspace.addWorkoutToDay(this.state.programId, workout.workoutId, target),
      'coachWorkspace.editor.addedToDay',
      this.state.selectedDay,
      true,
    );
  }

  copyToLibrary(): void {
    const workout = this.state.selectedCell?.workout;
    if (!workout || this.state.operationPending) return;
    this.state.busy = true;
    this.workspace
      .copyWorkout(workout.workoutId, `${workout.name} (2)`)
      .pipe(takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({
        next: (id) => {
          this.state.busy = false;
          void this.router.navigate(['/coach/workouts', id, 'edit']);
        },
        error: (error) => {
          this.state.busy = false;
          this.effects.showError(error, 'coachWorkspace.editor.actionError');
        },
      });
  }

  get selectedWorkoutDayCount(): number {
    const workoutId = this.state.selectedCell?.workout?.workoutId;
    return workoutId == null ? 0 : this.state.cells.filter((cell) => cell.link?.workoutId === workoutId).length;
  }
}
