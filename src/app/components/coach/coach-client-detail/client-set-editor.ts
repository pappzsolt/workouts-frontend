import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, concat, of, takeUntil, tap, toArray } from 'rxjs';
import type { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { ClientSetValues } from '../../../models/coach-workspace.model';
import type { ClientDetailEffects } from './client-detail-effects';
import {
  type ClientWorkoutEntry, type EditableSet, type ExerciseSets,
  fillDownSets, isSetChanged, isSetInvalid, restoreSet, setValues, toEditable,
} from './client-plan';

/** Owns editable sets, sequential saves, and confirmed exercise/workout totals. */
export class ClientSetEditor {
  exerciseSets: ExerciseSets[] = [];
  saving = false;
  deleteSetId: number | null = null;
  setBusy = false;

  constructor(
    private readonly workspace: Pick<CoachWorkspaceService, 'getClientWorkoutSets' | 'addClientSet' | 'saveClientSet' | 'deleteClientSet'>,
    private readonly effects: ClientDetailEffects,
    private readonly selectedWorkout: () => ClientWorkoutEntry | null,
  ) {}

  reset(): void {
    this.clearWorkout();
    this.saving = false;
    this.setBusy = false;
  }

  clearWorkout(): void {
    this.exerciseSets = [];
    this.deleteSetId = null;
  }

  loadWorkout(workout: ClientWorkoutEntry | null): void {
    this.deleteSetId = null;
    this.exerciseSets = (workout?.exercises ?? []).map(exercise => ({ exercise, sets: [], loading: true }));
    for (const entry of this.exerciseSets) this.loadSets(entry);
  }

  private loadSets(entry: ExerciseSets, keepEdits = false): void {
    entry.loading = true;
    const previous = keepEdits ? entry.sets : [];
    this.workspace
      .getClientWorkoutSets(entry.exercise.userWorkoutExerciseId)
      .pipe(takeUntil(this.effects.cancelled$), takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({
        next: (sets) => {
          entry.sets = [...sets]
            .sort((a, b) => a.setNumber - b.setNumber)
            .map((set) => {
              const edited = previous.find((row) => row.id === set.id);
              return edited && this.isChanged(edited) ? edited : toEditable(set);
            });
          entry.loading = false;
        },
        error: (error) => {
          entry.loading = false;
          this.effects.showError(error, 'coachWorkspace.client.planLoadError');
        },
      });
  }

  // ----------------------------------------------------------
  // Sorozatok
  // ----------------------------------------------------------

  isChanged(row: EditableSet): boolean {
    return isSetChanged(row);
  }

  isInvalid(row: EditableSet): boolean {
    return isSetInvalid(row);
  }

  get changedRows(): EditableSet[] {
    return this.exerciseSets.flatMap((entry) => entry.sets.filter((row) => this.isChanged(row)));
  }

  get dirty(): boolean {
    return this.changedRows.length > 0;
  }

  completedCount(entry: ExerciseSets): number {
    return entry.sets.filter((row) => row.original.completed).length;
  }

  /** Az első sorozat cél értékei (ismétlés, súly, pihenő, tervezett RPE) a többi, nem teljesített sorozatra. */
  fillDown(entry: ExerciseSets): void {
    fillDownSets(entry);
  }

  addSet(entry: ExerciseSets): void {
    if (this.setBusy) return;
    const last = entry.sets[entry.sets.length - 1];
    const prefill = last ? this.values(last) : null;
    this.setBusy = true;
    this.workspace
      .addClientSet(entry.exercise.userWorkoutExerciseId)
      .pipe(takeUntil(this.effects.cancelled$), takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({
        next: (setId) => {
          // Az új sorozat az előző sor cél értékeivel indul (utána szabadon módosítható).
          const save$: Observable<unknown> =
            prefill && setId
              ? this.workspace.saveClientSet(setId, {
                  ...prefill,
                  actualRepetitions: null,
                  actualWeightKg: null,
                  completed: false,
                  notes: null,
                })
              : of(null);
          save$.pipe(takeUntil(this.effects.cancelled$), takeUntilDestroyed(this.effects.destroyRef)).subscribe({
            next: () => {
              this.setBusy = false;
              this.loadSets(entry, true);
              entry.exercise.setsTotal += 1;
              this.refreshWorkoutTotals();
            },
            error: (error) => {
              this.setBusy = false;
              this.loadSets(entry, true);
              this.effects.showError(error, 'coachWorkspace.client.saveError');
            },
          });
        },
        error: (error) => {
          this.setBusy = false;
          this.effects.showError(error, 'coachWorkspace.client.addSetError');
        },
      });
  }

  askDeleteSet(row: EditableSet): void {
    this.deleteSetId = row.id;
  }

  cancelDeleteSet(): void {
    this.deleteSetId = null;
  }

  confirmDeleteSet(entry: ExerciseSets): void {
    const id = this.deleteSetId;
    if (id === null || this.setBusy) return;
    const removed = entry.sets.find((row) => row.id === id);
    this.setBusy = true;
    this.workspace
      .deleteClientSet(id)
      .pipe(takeUntil(this.effects.cancelled$), takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({
        next: () => {
          this.setBusy = false;
          this.deleteSetId = null;
          entry.sets = entry.sets.filter((row) => row.id !== id);
          entry.exercise.setsTotal = Math.max(0, entry.exercise.setsTotal - 1);
          if (removed?.original.completed) entry.exercise.setsCompleted = Math.max(0, entry.exercise.setsCompleted - 1);
          this.refreshWorkoutTotals();
          this.effects.showMessage('coachWorkspace.client.setDeleted', 'success');
          this.loadSets(entry, true);
        },
        error: (error) => {
          this.setBusy = false;
          this.deleteSetId = null;
          this.effects.showError(error, 'coachWorkspace.client.deleteSetError');
        },
      });
  }

  saveSets(after?: () => void): void {
    if (this.saving) return;
    const changed = this.changedRows;
    if (changed.length === 0) {
      after?.();
      return;
    }
    if (changed.some((row) => this.isInvalid(row))) {
      this.effects.showMessage('coachWorkspace.client.invalidSetValues', 'error');
      return;
    }
    // Snapshot the payload: edits made while the request is pending must remain dirty.
    const saves = changed.map((row) => ({ row, values: this.values(row)!, expected: { ...row.original } }));
    this.saving = true;
    concat(...saves.map(({ row, values, expected }) => this.workspace.saveClientSet(row.id, values, expected).pipe(
      // Each request commits independently. Preserve edits made while it was pending;
      // a later failure must not cause an already confirmed row to be sent again.
      tap(() => {
        row.original = { ...values };
        for (const entry of this.exerciseSets) entry.exercise.setsCompleted = this.completedCount(entry);
        this.refreshWorkoutTotals();
      }),
    )))
      .pipe(toArray(), takeUntil(this.effects.cancelled$), takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.effects.showMessage('coachWorkspace.client.saved', 'success');
          if (!this.dirty) after?.();
        },
        error: (error) => {
          this.saving = false;
          this.effects.showError(error, 'coachWorkspace.client.saveError');
          for (const entry of this.exerciseSets) this.loadSets(entry, true);
        },
      });
  }

  discardChanges(): void {
    for (const entry of this.exerciseSets) entry.sets.forEach(restoreSet);
  }

  private refreshWorkoutTotals(): void {
    const workout = this.selectedWorkout();
    if (!workout) return;
    workout.setsTotal = workout.exercises.reduce((sum, e) => sum + e.setsTotal, 0);
    workout.setsCompleted = workout.exercises.reduce((sum, e) => sum + e.setsCompleted, 0);
  }

  /** A sor értékei mentésre kész formában; érvénytelen értéknél null. */
  values(row: EditableSet): ClientSetValues | null {
    return setValues(row);
  }
}
