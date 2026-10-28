import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, concat, finalize, of, takeUntil, tap, toArray } from 'rxjs';

import { SHARED_IMPORTS } from '../../shared/shared-imports';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import { toIsoDate } from '../../../shared/local-date';
import type {
  ClientSetValues,
  CoachClientOverview,
  CoachClientProgram,
  CoachProgram,
  CoachWorkoutStatus,
} from '../../../models/coach-workspace.model';
import { downloadBlob, errorText, initial, programExportFileName } from '../coach-ui';
import {
  type ClientWorkoutEntry,
  type EditableSet,
  type ExerciseSets,
  type WeekGroup,
  buildWeeks,
  fillDownSets,
  groupWorkouts,
  isSetChanged,
  isSetInvalid,
  programStateKey,
  restoreSet,
  setValues,
  sortPrograms,
  toEditable,
  workoutStatus,
} from './client-plan';
import { ClientAssignDialogComponent } from './parts/client-assign-dialog.component';
import { ClientExerciseSetsComponent } from './parts/client-exercise-sets.component';
import { ClientProgramsTabComponent } from './parts/client-programs-tab.component';
import { ClientWorkoutListComponent } from './parts/client-workout-list.component';

export type { ClientExerciseEntry, ClientWorkoutEntry, EditableSet, ExerciseSets } from './client-plan';

type PendingNav =
  | { kind: 'workout'; index: number }
  | { kind: 'program'; programId: number }
  | { kind: 'tab'; tab: 'plan' | 'programs' };

/**
 * Ügyfél oldal: fejléc, programok (kiosztás, visszavonás), és a kiválasztott
 * program összes edzése, edzésenként a gyakorlatok sorozatai soronként
 * szerkeszthetően: cél ismétlés, cél súly, pihenő, tényleges ismétlés és súly,
 * teljesítve, megjegyzés. Ez váltja ki a régi „Edzés és sorozatok beállítása”
 * és „Program hozzárendelés” oldalt.
 */
@Component({
  selector: 'app-coach-client-detail',
  standalone: true,
  imports: [
    ...SHARED_IMPORTS, ClientWorkoutListComponent, ClientExerciseSetsComponent, ClientProgramsTabComponent,
    ClientAssignDialogComponent,
  ],
  templateUrl: './coach-client-detail.component.html',
})
export class CoachClientDetailComponent implements OnInit {
  private readonly workspace = inject(CoachWorkspaceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly programLoadCancelled$ = new Subject<void>();
  private readonly clientLoadCancelled$ = new Subject<void>();
  private readonly clientContextCancelled$ = new Subject<void>();

  readonly initial = initial;
  readonly todayIso = toIsoDate(new Date());

  userId = 0;
  client: CoachClientOverview | null = null;
  loading = true;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  messageParams: Record<string, unknown> = {};

  tab: 'plan' | 'programs' = 'plan';

  // Program és edzései
  programId: number | null = null;
  programLoading = false;
  programLoadFailed = false;
  workouts: ClientWorkoutEntry[] = [];
  weeks: WeekGroup[] = [];
  selectedIndex = -1;

  // Kiválasztott edzés sorozatai
  exerciseSets: ExerciseSets[] = [];
  saving = false;
  rescheduleDate = '';
  deleteSetId: number | null = null;
  setBusy = false;
  pendingNav: PendingNav | null = null;

  // Program kiosztás
  assignOpen = false;
  assignLoading = false;
  assignablePrograms: CoachProgram[] = [];
  assignProgramId: number | null = null;
  assigning = false;

  // Visszavonás
  revokeProgramId: number | null = null;

  // Excel-export
  exporting = false;

  private requestedWorkoutId: number | null = null;
  private requestedDate: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.resetClientContext();
      const id = Number(params.get('userId'));
      if (!Number.isInteger(id) || id <= 0) {
        void this.router.navigate(['/coach/clients']);
        return;
      }
      this.userId = id;
      const query = this.route.snapshot.queryParamMap;
      const workout = Number(query.get('workout'));
      this.requestedWorkoutId = Number.isInteger(workout) && workout > 0 ? workout : null;
      const date = query.get('date');
      this.requestedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
      const program = Number(query.get('program'));
      this.tab = query.get('tab') === 'programs' ? 'programs' : 'plan';
      this.loadClient(Number.isInteger(program) && program > 0 ? program : null);
    });
  }

  // ----------------------------------------------------------
  // Ügyfél és programjai
  // ----------------------------------------------------------

  private resetClientContext(): void {
    this.clientContextCancelled$.next();
    this.clientLoadCancelled$.next();
    this.programLoadCancelled$.next();
    this.userId = 0;
    this.client = null;
    this.loading = true;
    this.programId = null;
    this.programLoading = false;
    this.programLoadFailed = false;
    this.workouts = [];
    this.weeks = [];
    this.selectedIndex = -1;
    this.exerciseSets = [];
    this.saving = false;
    this.setBusy = false;
    this.rescheduleDate = '';
    this.deleteSetId = null;
    this.pendingNav = null;
    this.assignOpen = false;
    this.assignLoading = false;
    this.assignablePrograms = [];
    this.assignProgramId = null;
    this.assigning = false;
    this.revokeProgramId = null;
    this.exporting = false;
    this.requestedWorkoutId = null;
    this.requestedDate = null;
    this.message = '';
    this.messageType = 'info';
    this.messageParams = {};
  }

  private loadClient(preferredProgramId: number | null): void {
    this.clientLoadCancelled$.next();
    const userId = this.userId;
    this.loading = true;
    this.workspace
      .getOverview(this.todayIso, this.todayIso, userId)
      .pipe(takeUntil(this.clientLoadCancelled$), takeUntil(this.clientContextCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overview) => {
          if (this.userId !== userId) return;
          this.client = overview.clients.find((client) => client.userId === userId) ?? null;
          this.loading = false;
          const programs = this.sortedPrograms;
          let target = preferredProgramId ?? this.programId;
          if (target !== null && !programs.some((p) => p.programId === target)) target = null;
          target ??= programs[0]?.programId ?? null;
          if (target !== null) {
            this.loadProgram(target);
          } else {
            this.programLoadCancelled$.next();
            this.programId = null;
            this.programLoading = false;
            this.programLoadFailed = false;
            this.workouts = [];
            this.weeks = [];
            this.selectedIndex = -1;
            this.exerciseSets = [];
          }
        },
        error: (error) => {
          if (this.userId !== userId) return;
          this.loading = false;
          this.showError(error, 'coachWorkspace.loadError');
        },
      });
  }

  /** Aktív programok elöl, aztán a később indulók, végül a befejezettek (legújabb elöl). */
  get sortedPrograms(): CoachClientProgram[] {
    return sortPrograms(this.client?.programs ?? [], this.todayIso);
  }

  programStateKey(program: CoachClientProgram): string {
    return programStateKey(program, this.todayIso);
  }

  get selectedProgram(): CoachClientProgram | null {
    return this.client?.programs.find((p) => p.programId === this.programId) ?? null;
  }

  // ----------------------------------------------------------
  // Program edzései
  // ----------------------------------------------------------

  selectProgram(programId: number | string): void {
    const id = Number(programId);
    if (id === this.programId) return;
    if (this.dirty) {
      this.pendingNav = { kind: 'program', programId: id };
      return;
    }
    this.loadProgram(id);
  }

  retryProgram(): void {
    if (this.programId !== null && !this.programLoading) this.loadProgram(this.programId);
  }

  private loadProgram(programId: number): void {
    this.programLoadCancelled$.next();
    const keep = this.requestedWorkoutId ?? (this.programId === programId ? this.selected?.userWorkoutId : null) ?? null;
    this.programId = programId;
    this.programLoading = true;
    if (this.programLoadFailed) {
      this.message = '';
      this.messageParams = {};
    }
    this.programLoadFailed = false;
    this.workouts = [];
    this.weeks = [];
    this.selectedIndex = -1;
    this.exerciseSets = [];
    this.rescheduleDate = '';
    this.deleteSetId = null;
    this.pendingNav = null;
    this.workspace
      .getClientProgramRows(this.userId, programId)
      .pipe(takeUntil(this.programLoadCancelled$), takeUntil(this.clientContextCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          if (this.programId !== programId) return;
          this.requestedWorkoutId = null;
          this.workouts = groupWorkouts(rows);
          this.weeks = this.buildWeeks();
          this.programLoading = false;
          this.selectedIndex = -1;
          let index = keep === null ? -1 : this.workouts.findIndex((w) => w.userWorkoutId === keep);
          if (index < 0 && this.requestedDate) index = this.workouts.findIndex((w) => w.date === this.requestedDate);
          this.requestedDate = null;
          if (index < 0) index = this.defaultWorkoutIndex();
          this.openWorkout(index);
        },
        error: (error) => {
          if (this.programId !== programId) return;
          this.programLoading = false;
          this.programLoadFailed = true;
          this.showError(error, 'coachWorkspace.loadError');
        },
      });
  }

  /**
   * A kiválasztott program összes edzése, gyakorlata és sorozata Excel-fájlba (cél és
   * tényleges értékek, pihenő, teljesítés, megjegyzés). A mentett állapot kerül bele.
   */
  exportProgram(): void {
    const programId = this.programId;
    if (programId === null || this.exporting) return;
    const unsaved = this.dirty;
    const fileName = programExportFileName(this.selectedProgram?.name, this.client?.username);
    this.exporting = true;
    this.workspace
      .exportClientProgram(this.userId, programId)
      .pipe(
        finalize(() => (this.exporting = false)),
        takeUntil(this.clientContextCancelled$),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob) => {
          downloadBlob(blob, fileName);
          if (unsaved) this.showMessage('coachWorkspace.client.exportUnsaved', 'info');
        },
        error: (error) => this.showError(error, 'coachWorkspace.client.exportError'),
      });
  }

  /** Alapból a mai vagy a következő esedékes edzés, különben az utolsó. */
  private defaultWorkoutIndex(): number {
    if (this.workouts.length === 0) return -1;
    const upcoming = this.workouts.findIndex((w) => (w.date ?? '') >= this.todayIso && !w.completed);
    return upcoming >= 0 ? upcoming : this.workouts.length - 1;
  }

  private buildWeeks(): WeekGroup[] {
    return buildWeeks(this.workouts, this.selectedProgram?.startDate ?? null);
  }

  status(workout: ClientWorkoutEntry): CoachWorkoutStatus {
    return workoutStatus(workout, this.todayIso);
  }

  get selected(): ClientWorkoutEntry | null {
    return this.workouts[this.selectedIndex] ?? null;
  }

  get counts(): { total: number; done: number; missed: number } {
    return {
      total: this.workouts.length,
      done: this.workouts.filter((w) => w.completed).length,
      missed: this.workouts.filter((w) => this.status(w) === 'missed').length,
    };
  }

  selectWorkout(index: number): void {
    if (index < 0 || index >= this.workouts.length || index === this.selectedIndex) return;
    if (this.dirty) {
      this.pendingNav = { kind: 'workout', index };
      return;
    }
    this.openWorkout(index);
  }

  selectWorkoutById(userWorkoutId: number): void {
    this.selectWorkout(this.workouts.findIndex((w) => w.userWorkoutId === userWorkoutId));
  }

  private openWorkout(index: number): void {
    this.selectedIndex = index;
    this.deleteSetId = null;
    this.pendingNav = null;
    const workout = this.selected;
    this.rescheduleDate = workout?.date ?? '';
    this.exerciseSets = (workout?.exercises ?? []).map((exercise) => ({ exercise, sets: [], loading: true }));
    for (const entry of this.exerciseSets) this.loadSets(entry);
  }

  private loadSets(entry: ExerciseSets, keepEdits = false): void {
    entry.loading = true;
    const previous = keepEdits ? entry.sets : [];
    this.workspace
      .getClientWorkoutSets(entry.exercise.userWorkoutExerciseId)
      .pipe(takeUntil(this.clientContextCancelled$), takeUntilDestroyed(this.destroyRef))
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
          this.showError(error, 'coachWorkspace.client.planLoadError');
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
      .pipe(takeUntil(this.clientContextCancelled$), takeUntilDestroyed(this.destroyRef))
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
          save$.pipe(takeUntil(this.clientContextCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
              this.setBusy = false;
              this.loadSets(entry, true);
              entry.exercise.setsTotal += 1;
              this.refreshWorkoutTotals();
            },
            error: (error) => {
              this.setBusy = false;
              this.loadSets(entry, true);
              this.showError(error, 'coachWorkspace.client.saveError');
            },
          });
        },
        error: (error) => {
          this.setBusy = false;
          this.showError(error, 'coachWorkspace.client.addSetError');
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
      .pipe(takeUntil(this.clientContextCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setBusy = false;
          this.deleteSetId = null;
          entry.sets = entry.sets.filter((row) => row.id !== id);
          entry.exercise.setsTotal = Math.max(0, entry.exercise.setsTotal - 1);
          if (removed?.original.completed) entry.exercise.setsCompleted = Math.max(0, entry.exercise.setsCompleted - 1);
          this.refreshWorkoutTotals();
          this.showMessage('coachWorkspace.client.setDeleted', 'success');
          this.loadSets(entry, true);
        },
        error: (error) => {
          this.setBusy = false;
          this.deleteSetId = null;
          this.showError(error, 'coachWorkspace.client.deleteSetError');
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
      this.showMessage('coachWorkspace.client.invalidSetValues', 'error');
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
      .pipe(toArray(), takeUntil(this.clientContextCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.showMessage('coachWorkspace.client.saved', 'success');
          if (!this.dirty) after?.();
        },
        error: (error) => {
          this.saving = false;
          this.showError(error, 'coachWorkspace.client.saveError');
          for (const entry of this.exerciseSets) this.loadSets(entry, true);
        },
      });
  }

  discardChanges(): void {
    for (const entry of this.exerciseSets) entry.sets.forEach(restoreSet);
  }

  /** Mentetlen változás közbeni navigáció: mentés, elvetés vagy maradás. */
  resolvePending(action: 'save' | 'discard' | 'cancel'): void {
    const nav = this.pendingNav;
    if (!nav) return;
    if (action === 'cancel') {
      this.pendingNav = null;
      return;
    }
    const go = () => {
      this.pendingNav = null;
      if (nav.kind === 'workout') this.openWorkout(nav.index);
      else if (nav.kind === 'program') this.loadProgram(nav.programId);
      else this.tab = nav.tab;
    };
    if (action === 'discard') {
      this.discardChanges();
      go();
    } else {
      this.saveSets(go);
    }
  }

  setTab(tab: 'plan' | 'programs'): void {
    if (tab === this.tab) return;
    if (this.dirty && tab !== 'plan') {
      this.pendingNav = { kind: 'tab', tab };
      return;
    }
    this.tab = tab;
  }

  private refreshWorkoutTotals(): void {
    const workout = this.selected;
    if (!workout) return;
    workout.setsTotal = workout.exercises.reduce((sum, e) => sum + e.setsTotal, 0);
    workout.setsCompleted = workout.exercises.reduce((sum, e) => sum + e.setsCompleted, 0);
  }

  /** A sor értékei mentésre kész formában; érvénytelen értéknél null. */
  values(row: EditableSet): ClientSetValues | null {
    return setValues(row);
  }

  // ----------------------------------------------------------
  // Edzés dátuma
  // ----------------------------------------------------------

  reschedule(): void {
    const workout = this.selected;
    if (!workout || !this.rescheduleDate || this.rescheduleDate === workout.date) return;
    const id = workout.userWorkoutId;
    this.workspace
      .rescheduleWorkout(id, this.rescheduleDate)
      .pipe(takeUntil(this.clientContextCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showMessage('coachWorkspace.client.rescheduled', 'success');
          this.requestedWorkoutId = id;
          if (this.programId !== null) this.loadProgram(this.programId);
        },
        error: (error) => this.showError(error, 'coachWorkspace.client.rescheduleError'),
      });
  }

  // ----------------------------------------------------------
  // Program kiosztás / visszavonás
  // ----------------------------------------------------------

  openAssign(): void {
    this.assignOpen = true;
    this.assignLoading = true;
    this.assignProgramId = null;
    const assigned = new Set((this.client?.programs ?? []).map((program) => program.programId));
    this.workspace
      .getCoachPrograms()
      .pipe(takeUntil(this.clientContextCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (programs) => {
          this.assignablePrograms = programs
            .filter((program) => !assigned.has(program.programId))
            .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
          this.assignProgramId = this.assignablePrograms[0]?.programId ?? null;
          this.assignLoading = false;
        },
        error: (error) => {
          this.assignLoading = false;
          this.assignOpen = false;
          this.showError(error, 'coachWorkspace.loadError');
        },
      });
  }

  closeAssign(): void {
    if (!this.assigning) this.assignOpen = false;
  }

  confirmAssign(): void {
    if (this.assignProgramId === null || this.assigning) return;
    this.assigning = true;
    const programId = this.assignProgramId;
    const program = this.assignablePrograms.find((p) => p.programId === programId);
    this.workspace
      .assignProgram(this.userId, programId)
      .pipe(takeUntil(this.clientContextCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.assigning = false;
          this.assignOpen = false;
          this.showMessage('coachWorkspace.client.assignedNamed', 'success', { program: program?.programName ?? '' });
          this.tab = 'plan';
          this.loadClient(programId);
        },
        error: (error) => {
          this.assigning = false;
          this.showError(error, 'coachWorkspace.client.assignError');
        },
      });
  }

  askRevoke(programId: number): void {
    this.revokeProgramId = programId;
  }

  cancelRevoke(): void {
    this.revokeProgramId = null;
  }

  confirmRevoke(): void {
    if (this.revokeProgramId === null) return;
    const programId = this.revokeProgramId;
    this.workspace
      .revokeProgram(programId, this.userId)
      .pipe(takeUntil(this.clientContextCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.revokeProgramId = null;
          this.showMessage('coachWorkspace.client.revoked', 'success');
          if (this.programId === programId) this.programId = null;
          this.loadClient(null);
        },
        error: (error) => {
          this.revokeProgramId = null;
          this.showError(error, 'coachWorkspace.client.revokeError');
        },
      });
  }

  // ----------------------------------------------------------
  // Segédek
  // ----------------------------------------------------------

  genderKey(gender: string | null): string {
    if (gender === 'MALE') return 'common.male';
    if (gender === 'FEMALE') return 'common.female';
    return 'common.genderNotSpecified';
  }

  private showMessage(key: string, type: 'success' | 'error' | 'info', params: Record<string, unknown> = {}): void {
    this.message = key;
    this.messageType = type;
    this.messageParams = params;
  }

  private showError(error: unknown, fallbackKey: string): void {
    this.showMessage(errorText(error, fallbackKey), 'error');
  }
}
