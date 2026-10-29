import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { ProgramEditorState } from './program-editor-state';
import type { ProgramEditorEffects } from './program-editor-effects';
import type { Router } from '@angular/router';
import { concat, tap, toArray } from 'rxjs';
import { WORKOUT_PRESCRIPTION_LIMITS } from '../../../models/workout-prescription-limits';
import { type EditableExercise, isPrescriptionChanged, weeklyRepeat } from './program-days';

/** Selected workout prescriptions, ordering, moves and repetition. */
export class ProgramDayWorkoutEditor {
  readonly prescriptionLimits = WORKOUT_PRESCRIPTION_LIMITS;
  rows: EditableExercise[] = [];
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
    this.moveDate = this.state.form.startDate ? this.state.dateForDay(day) : '';
    this.extraDate = this.state.form.startDate ? this.state.dateForDay(Math.min(day + 7, this.state.cells.length || day)) : '';
    const cell = this.state.selectedCell;
    this.rows = (cell?.workout?.exercises ?? []).map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      sets: exercise.sets,
      repetitions: exercise.repetitions,
      restSeconds: exercise.restSeconds,
      original: {
        sets: exercise.sets,
        repetitions: exercise.repetitions,
        restSeconds: exercise.restSeconds,
      },
    }));
  }

  isChanged(row: EditableExercise): boolean {
    return isPrescriptionChanged(row);
  }

  get changedCount(): number {
    return this.rows.filter((row) => this.isChanged(row)).length;
  }

  savePrescriptions(): void {
    const workout = this.state.selectedCell?.workout;
    if (!workout || this.state.busy || this.state.savingDetails || this.state.loading) return;
    const changed = this.rows.filter((row) => this.isChanged(row));
    if (changed.length === 0) return;
    const invalid = changed.find(
      (row) =>
        !Number.isInteger(Number(row.sets)) || Number(row.sets) < 1 || Number(row.sets) > this.prescriptionLimits.maxSets ||
        !Number.isInteger(Number(row.repetitions)) || Number(row.repetitions) < 1 || Number(row.repetitions) > this.prescriptionLimits.maxRepetitions ||
        !Number.isInteger(Number(row.restSeconds)) || Number(row.restSeconds) < 0 || Number(row.restSeconds) > this.prescriptionLimits.maxRestSeconds,
    );
    if (invalid) {
      this.effects.showMessage('coachWorkspace.editor.prescriptionInvalid', 'error');
      return;
    }
    const requests = changed.map((row) => {
      const submitted = {
        sets: Number(row.sets),
        repetitions: Number(row.repetitions),
        restSeconds: Number(row.restSeconds),
      };
      return this.workspace.updatePrescription(workout.workoutId, row.id, submitted).pipe(
        // Advance only the confirmed baseline; newer edits stay in the row.
        tap(() => { row.original = { ...submitted }; }),
      );
    });
    this.effects.run(
      concat(...requests).pipe(toArray()),
      'coachWorkspace.editor.prescriptionSaved',
      this.state.selectedDay,
      true,
    );
  }

  moveWorkout(): void {
    const link = this.state.selectedCell?.link;
    const target = this.state.dayForDate(this.moveDate);
    if (!link || !Number.isInteger(target) || target < 1 || target === link.dayIndex) return;
    if (target > this.state.cells.length) {
      this.effects.showMessage('coachWorkspace.editor.dayOutOfRange', 'error');
      return;
    }
    this.effects.run(this.workspace.moveWorkoutToDay(link.id, target), 'coachWorkspace.editor.moved', target);
  }

  removeWorkout(): void {
    const link = this.state.selectedCell?.link;
    if (!link) return;
    this.confirmRemove = false;
    this.effects.run(this.workspace.removeWorkoutFromDay(link.id), 'coachWorkspace.editor.removed', this.state.selectedDay);
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
    if (this.state.programId === null || !workout || days.length === 0 || this.state.busy) return;
    const programId = this.state.programId;
    this.confirmRepeat = false;
    this.effects.run(
      concat(...days.map((day) => this.workspace.addWorkoutToDay(programId, workout.workoutId, day))).pipe(toArray()),
      'coachWorkspace.editor.repeated',
      this.state.selectedDay,
      true,
    );
  }

  addToAnotherDay(): void {
    const workout = this.state.selectedCell?.workout;
    const target = this.state.dayForDate(this.extraDate);
    if (this.state.programId === null || !workout || this.state.busy) return;
    if (!Number.isInteger(target) || target < 1 || target > this.state.cells.length) {
      this.effects.showMessage('coachWorkspace.editor.dayOutOfRange', 'error');
      return;
    }
    if (this.state.cells[target - 1]?.link) {
      this.effects.showMessage('coachWorkspace.editor.dayTaken', 'error');
      return;
    }
    this.effects.run(
      this.workspace.addWorkoutToDay(this.state.programId, workout.workoutId, target),
      'coachWorkspace.editor.addedToDay',
      this.state.selectedDay,
      true,
    );
  }

  moveRow(index: number, direction: -1 | 1): void {
    const workout = this.state.selectedCell?.workout;
    const row = this.rows[index];
    const target = index + direction;
    if (!workout || !row || target < 0 || target >= this.rows.length || this.state.busy) return;
    if (this.changedCount > 0) {
      this.effects.showMessage('coachWorkspace.editor.saveBeforeReorder', 'error');
      return;
    }
    this.effects.run(
      this.workspace.moveTemplateExercise(workout.workoutId, row.id, target),
      'coachWorkspace.editor.reordered',
      this.state.selectedDay,
    );
  }

  applyTemplateToClients(): void {
    const workout = this.state.selectedCell?.workout;
    if (!workout || this.state.busy) return;
    if (this.changedCount > 0) {
      this.effects.showMessage('coachWorkspace.editor.saveBeforeApply', 'error');
      return;
    }
    this.state.busy = true;
    this.workspace
      .applyTemplate(workout.workoutId)
      .pipe(takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({
        next: (result) => {
          this.state.busy = false;
          this.effects.showMessage('coachWorkspace.editor.templateApplied', 'success', { ...result });
        },
        error: (error) => {
          this.state.busy = false;
          this.effects.showError(error, 'coachWorkspace.editor.actionError');
        },
      });
  }

  copyToLibrary(): void {
    const workout = this.state.selectedCell?.workout;
    if (!workout || this.state.busy) return;
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
