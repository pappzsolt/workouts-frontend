import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { ProgramEditorState } from './program-editor-state';
import type { ProgramEditorEffects } from './program-editor-effects';
import { concat, concatMap, map, of, throwError, tap, toArray, type Observable } from 'rxjs';
import type { CoachExerciseSearchItem, CoachWorkoutSummary } from '../../../models/coach-workspace.model';
import { freeDaysFrom } from './program-days';

interface PendingWorkout {
  id: number;
  name: string;
  programId: number;
  day: number;
  exerciseIds: number[];
}

/** Empty-day drafts, library selection and adding several workouts. */
export class ProgramWorkoutLibrary {
  multiOpen = false;
  multiFilter = '';
  multiSelected: number[] = [];
  emptyMode: 'new' | 'library' = 'new';
  myWorkouts: CoachWorkoutSummary[] = [];
  libraryFilter = '';
  copySourceId: number | null = null;
  workoutName = '';
  pendingExercises: CoachExerciseSearchItem[] = [];
  private pendingWorkout: PendingWorkout | null = null;

  get recoveryWorkout(): { id: number; name: string } | null { return this.pendingWorkout; }
  constructor(
    private readonly state: ProgramEditorState,
    private readonly workspace: CoachWorkspaceService,
    private readonly effects: ProgramEditorEffects,
  ) {}

  openDay(): void {
    this.pendingWorkout = null;
    const cell = this.state.selectedCell;
    if (cell && !cell.workout) {
      this.workoutName = '';
      this.pendingExercises = [];
      this.copySourceId = null;
      this.libraryFilter = '';
      if (this.myWorkouts.length === 0) this.loadMyWorkouts();
    }
  }

  loadMyWorkouts(): void {
    this.workspace
      .getMyWorkouts()
      .pipe(takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({ next: (workouts) => (this.myWorkouts = workouts), error: () => (this.myWorkouts = []) });
  }

  addPending(exercise: CoachExerciseSearchItem): void {
    if (!this.pendingExercises.some((item) => item.id === exercise.id)) {
      this.pendingExercises = [...this.pendingExercises, exercise];
    }
  }

  removePending(exerciseId: number): void {
    this.pendingExercises = this.pendingExercises.filter((item) => item.id !== exerciseId);
  }

  isPending(exerciseId: number): boolean {
    return this.pendingExercises.some((item) => item.id === exerciseId);
  }

  captureDraft() {
    if (!this.hasDraft) return null;
    return { workoutName: this.workoutName, pendingExercises: [...this.pendingExercises], copySourceId: this.copySourceId,
      emptyMode: this.emptyMode, libraryFilter: this.libraryFilter, pendingWorkout: this.pendingWorkout };
  }

  restoreDraft(draft: NonNullable<ReturnType<ProgramWorkoutLibrary['captureDraft']>>): void {
    Object.assign(this, draft);
  }

  createWorkoutForDay(): void {
    if (this.state.programId === null || this.state.operationPending) return;
    const name = this.workoutName.trim();
    if (!this.pendingWorkout && (!name || this.pendingExercises.length === 0)) {
      this.effects.showMessage('coachWorkspace.editor.newWorkoutInvalid', 'error');
      return;
    }
    const programId = this.state.programId;
    const day = this.state.selectedDay;
    const exerciseIds = this.pendingExercises.map(exercise => exercise.id);
    const recovery = this.pendingWorkout;
    const context = recovery ? of(recovery) : this.workspace.createWorkout(name, this.state.dateForDay(day)).pipe(
      map(id => this.pendingWorkout = { id, name, programId, day, exerciseIds }),
    );
    this.effects.run(context.pipe(concatMap(workout => {
      const finish = () => this.workspace.replaceWorkoutExercises(workout.id, workout.exerciseIds).pipe(
        concatMap(() => this.workspace.addWorkoutToDay(workout.programId, workout.id, workout.day)),
      );
      if (!recovery) return finish();
      // A previous link request may have succeeded before its response was lost.
      return this.workspace.getProgramDays(workout.programId).pipe(concatMap(links => {
        const existing = links.find(link => link.dayIndex === workout.day);
        if (existing?.workoutId === workout.id) return of(undefined);
        if (existing) return throwError(() => new Error('coachWorkspace.editor.dayTaken'));
        // Membership replacement is atomic and safe to repeat after an uncertain response.
        return finish();
      }));
    })), {
      success: () => {
        this.pendingWorkout = null;
        this.myWorkouts = [];
        this.effects.showMessage('coachWorkspace.editor.workoutCreated', 'success');
        this.effects.reload(day);
      },
      failure: error => {
        if (this.pendingWorkout) {
          this.myWorkouts = [];
          this.effects.showMessage('coachWorkspace.editor.partialWorkoutCreated', 'error');
        } else this.effects.showError(error, 'coachWorkspace.editor.actionError');
        // Keep the draft intact. A known created workout is resumed, never created again.
      },
    });
  }

  private runLibraryAction(operation: Observable<unknown>, message: string, day: number): void {
    this.effects.run(operation, {
      success: () => { this.myWorkouts = []; this.effects.showMessage(message, 'success'); this.effects.reload(day); },
      failure: error => { this.effects.showError(error, 'coachWorkspace.editor.actionError'); this.effects.reload(day, true); },
    });
  }

  get pendingIds(): number[] {
    return this.pendingExercises.map((item) => item.id);
  }

  get libraryWorkouts(): CoachWorkoutSummary[] {
    const term = this.libraryFilter.trim().toLowerCase();
    const inProgram = new Set((this.state.program?.workouts ?? []).map((w) => w.workoutId));
    return this.myWorkouts
      .filter((workout) => !term || workout.name.toLowerCase().includes(term))
      .sort((a, b) => Number(inProgram.has(b.id)) - Number(inProgram.has(a.id)) || a.name.localeCompare(b.name));
  }

  isInProgram(workoutId: number): boolean {
    return (this.state.program?.workouts ?? []).some((workout) => workout.workoutId === workoutId);
  }

  get programWorkoutIds(): Set<number> {
    return new Set((this.state.program?.workouts ?? []).map((workout) => workout.workoutId));
  }

  linkLibraryWorkout(): void {
    if (this.state.programId === null || this.copySourceId === null || this.state.operationPending) return;
    const day = this.state.selectedDay;
    this.runLibraryAction(
      this.workspace.addWorkoutToDay(this.state.programId, this.copySourceId, day),
      'coachWorkspace.editor.workoutLinked',
      day,
    );
  }

  copyWorkoutToDay(): void {
    if (this.state.programId === null || this.state.operationPending) return;
    const name = this.workoutName.trim();
    if (this.copySourceId === null || !name) {
      this.effects.showMessage('coachWorkspace.editor.copyInvalid', 'error');
      return;
    }
    const day = this.state.selectedDay;
    this.runLibraryAction(
      this.workspace.copyWorkoutToDay(this.copySourceId, this.state.programId, name, this.state.dateForDay(day), day),
      'coachWorkspace.editor.workoutCopied',
      day,
    );
  }

  onCopySourceChange(sourceId: number | null): void {
    this.copySourceId = sourceId;
    const source = this.myWorkouts.find((workout) => workout.id === sourceId);
    if (source) this.workoutName = source.name;
  }

  get hasDraft(): boolean {
    return !!this.state.selectedCell && !this.state.selectedCell.workout
      && (!!this.pendingWorkout || !!this.workoutName.trim() || this.pendingExercises.length > 0 || this.copySourceId !== null);
  }

  private blockMultiForDraft(): boolean {
    if (!this.hasDraft) return false;
    this.effects.showMessage('coachWorkspace.editor.saveBeforeBulkAdd', 'error');
    return true;
  }

  openMulti(): void {
    if (this.state.operationPending || this.blockMultiForDraft()) return;
    this.multiOpen = true;
    this.multiSelected = [];
    this.multiFilter = '';
    if (this.myWorkouts.length === 0) this.loadMyWorkouts();
  }

  toggleMulti(workoutId: number, checked: boolean): void {
    this.multiSelected = checked
      ? [...this.multiSelected, workoutId]
      : this.multiSelected.filter((id) => id !== workoutId);
  }

  get multiWorkouts(): CoachWorkoutSummary[] {
    const term = this.multiFilter.trim().toLowerCase();
    return this.myWorkouts.filter((workout) => !term || workout.name.toLowerCase().includes(term));
  }

  get multiTargetDays(): number[] {
    return freeDaysFrom(this.state.cells, this.state.selectedDay, this.multiSelected.length);
  }

  addMultiple(): void {
    if (this.state.programId === null || this.state.operationPending || this.multiSelected.length === 0) return;
    if (this.blockMultiForDraft()) return;
    const days = this.multiTargetDays;
    if (days.length < this.multiSelected.length) {
      this.effects.showMessage('coachWorkspace.editor.notEnoughFreeDays', 'error');
      return;
    }
    const programId = this.state.programId;
    const pairs = this.multiSelected.map((workoutId, i) => ({ workoutId, day: days[i] }));
    this.multiOpen = false;
    let addedCount = 0;
    this.effects.run(
      concat(...pairs.map(pair => this.workspace.addWorkoutToDay(programId, pair.workoutId, pair.day)
        .pipe(tap(() => { addedCount++; })))).pipe(toArray()), {
        success: () => { this.effects.showMessage('coachWorkspace.editor.multiAdded', 'success'); this.effects.reload(pairs[0].day); },
        failure: error => {
          if (addedCount) this.effects.showMessage('coachWorkspace.editor.partialMultiAdded', 'error', { count: addedCount, total: pairs.length });
          else this.effects.showError(error, 'coachWorkspace.editor.actionError');
          this.effects.reload(this.state.selectedDay, true);
        },
      },
    );
  }
}
