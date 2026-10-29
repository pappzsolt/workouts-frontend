import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { ProgramEditorState } from './program-editor-state';
import type { ProgramEditorEffects } from './program-editor-effects';
import { concat, last, switchMap, toArray } from 'rxjs';
import type { CoachExerciseSearchItem, CoachWorkoutSummary } from '../../../models/coach-workspace.model';
import { freeDaysFrom } from './program-days';

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
  constructor(
    private readonly state: ProgramEditorState,
    private readonly workspace: CoachWorkspaceService,
    private readonly effects: ProgramEditorEffects,
  ) {}

  openDay(): void {
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

  createWorkoutForDay(): void {
    if (this.state.programId === null || this.state.busy) return;
    const name = this.workoutName.trim();
    if (!name || this.pendingExercises.length === 0) {
      this.effects.showMessage('coachWorkspace.editor.newWorkoutInvalid', 'error');
      return;
    }
    const programId = this.state.programId;
    const day = this.state.selectedDay;
    const exercises = [...this.pendingExercises];
    this.effects.run(
      this.workspace.createWorkout(name, this.state.dateForDay(day)).pipe(
        switchMap((workoutId) =>
          concat(
            ...exercises.map((exercise) => this.workspace.addExerciseToWorkout(workoutId, exercise.id)),
            this.workspace.addWorkoutToDay(programId, workoutId, day),
          ).pipe(last()),
        ),
      ),
      'coachWorkspace.editor.workoutCreated',
      day,
    );
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
    if (this.state.programId === null || this.copySourceId === null || this.state.busy) return;
    const day = this.state.selectedDay;
    this.effects.run(
      this.workspace.addWorkoutToDay(this.state.programId, this.copySourceId, day),
      'coachWorkspace.editor.workoutLinked',
      day,
    );
  }

  copyWorkoutToDay(): void {
    if (this.state.programId === null || this.state.busy) return;
    const name = this.workoutName.trim();
    if (this.copySourceId === null || !name) {
      this.effects.showMessage('coachWorkspace.editor.copyInvalid', 'error');
      return;
    }
    const day = this.state.selectedDay;
    this.effects.run(
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

  openMulti(): void {
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
    if (this.state.programId === null || this.state.busy || this.multiSelected.length === 0) return;
    const days = this.multiTargetDays;
    if (days.length < this.multiSelected.length) {
      this.effects.showMessage('coachWorkspace.editor.notEnoughFreeDays', 'error');
      return;
    }
    const programId = this.state.programId;
    const pairs = this.multiSelected.map((workoutId, i) => ({ workoutId, day: days[i] }));
    this.multiOpen = false;
    this.effects.run(
      concat(...pairs.map((pair) => this.workspace.addWorkoutToDay(programId, pair.workoutId, pair.day))).pipe(toArray()),
      'coachWorkspace.editor.multiAdded',
      pairs[0].day,
    );
  }
}
