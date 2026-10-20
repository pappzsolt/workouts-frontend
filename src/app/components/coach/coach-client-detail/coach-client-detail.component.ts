import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, concat, of, toArray } from 'rxjs';

import { SHARED_IMPORTS } from '../../shared/shared-imports';
import {
  CoachWorkspaceService,
  addDays,
  fromIsoDate,
  startOfWeek,
  toIsoDate,
} from '../../../services/coach/coach-workspace.service';
import type {
  ClientProgramRow,
  ClientSetValues,
  ClientWorkoutSet,
  CoachClientOverview,
  CoachClientProgram,
  CoachProgram,
  CoachWorkoutStatus,
} from '../../../models/coach-workspace.model';
import { errorText, initial, percent } from '../coach-ui';

/** Az ügyfél egy edzése a programban (a sorokból összerakva). */
export interface ClientWorkoutEntry {
  userWorkoutId: number;
  workoutId: number;
  name: string;
  date: string | null;
  dayIndex: number | null;
  completed: boolean;
  startedAt: string | null;
  feedback: string | null;
  exercises: ClientExerciseEntry[];
  setsTotal: number;
  setsCompleted: number;
}

export interface ClientExerciseEntry {
  userWorkoutExerciseId: number;
  workoutExerciseId: number;
  exerciseId: number;
  name: string;
  order: number;
  completed: boolean;
  setsTotal: number;
  setsCompleted: number;
  feedback: string | null;
  templateSets: number | null;
  templateRepetitions: number | null;
  templateRestSeconds: number | null;
}

/** Egy sorozat szerkeszthető sora (minden mező külön, mint a régi felületen). */
export interface EditableSet {
  id: number;
  setNumber: number;
  targetRepetitions: number | string | null;
  targetWeightKg: number | string | null;
  restSeconds: number | string | null;
  actualRepetitions: number | string | null;
  actualWeightKg: number | string | null;
  completed: boolean;
  notes: string | null;
  original: ClientSetValues;
}

export interface ExerciseSets {
  exercise: ClientExerciseEntry;
  sets: EditableSet[];
  loading: boolean;
}

interface WeekGroup {
  label: string;
  from: string;
  to: string;
  workouts: ClientWorkoutEntry[];
}

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
  imports: [...SHARED_IMPORTS],
  templateUrl: './coach-client-detail.component.html',
})
export class CoachClientDetailComponent implements OnInit {
  private readonly workspace = inject(CoachWorkspaceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly initial = initial;
  readonly percent = percent;
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

  private requestedWorkoutId: number | null = null;
  private requestedDate: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
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
      if (query.get('tab') === 'programs') this.tab = 'programs';
      this.loadClient(Number.isInteger(program) && program > 0 ? program : null);
    });
  }

  // ----------------------------------------------------------
  // Ügyfél és programjai
  // ----------------------------------------------------------

  private loadClient(preferredProgramId: number | null): void {
    this.loading = true;
    this.workspace
      .getOverview(this.todayIso, this.todayIso, this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overview) => {
          this.client = overview.clients[0] ?? null;
          this.loading = false;
          const programs = this.sortedPrograms;
          let target = preferredProgramId ?? this.programId;
          if (target !== null && !programs.some((p) => p.programId === target)) target = null;
          target ??= programs[0]?.programId ?? null;
          if (target !== null) {
            this.loadProgram(target);
          } else {
            this.programId = null;
            this.workouts = [];
            this.weeks = [];
            this.selectedIndex = -1;
            this.exerciseSets = [];
          }
        },
        error: (error) => {
          this.loading = false;
          this.showError(error, 'coachWorkspace.loadError');
        },
      });
  }

  /** Aktív programok elöl, aztán a később indulók, végül a befejezettek (legújabb elöl). */
  get sortedPrograms(): CoachClientProgram[] {
    const rank = (p: CoachClientProgram) =>
      this.programState(p) === 'active' ? 0 : this.programState(p) === 'upcoming' ? 1 : 2;
    return [...(this.client?.programs ?? [])].sort(
      (a, b) => rank(a) - rank(b) || (b.startDate ?? '').localeCompare(a.startDate ?? ''),
    );
  }

  programState(program: CoachClientProgram): 'active' | 'upcoming' | 'finished' {
    if (program.endDate && program.endDate < this.todayIso) return 'finished';
    if (program.startDate && program.startDate > this.todayIso) return 'upcoming';
    return 'active';
  }

  programStateKey(program: CoachClientProgram): string {
    const state = this.programState(program);
    return state === 'finished'
      ? 'coachWorkspace.client.finished'
      : state === 'upcoming'
        ? 'coachWorkspace.client.upcoming'
        : 'coachWorkspace.client.active';
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

  private loadProgram(programId: number): void {
    this.programId = programId;
    this.programLoading = true;
    this.workspace
      .getClientProgramRows(this.userId, programId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          if (this.programId !== programId) return;
          const keep = this.requestedWorkoutId ?? this.selected?.userWorkoutId ?? null;
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
          this.programLoading = false;
          this.showError(error, 'coachWorkspace.loadError');
        },
      });
  }

  /** Alapból a mai vagy a következő esedékes edzés, különben az utolsó. */
  private defaultWorkoutIndex(): number {
    if (this.workouts.length === 0) return -1;
    const upcoming = this.workouts.findIndex((w) => (w.date ?? '') >= this.todayIso && !w.completed);
    return upcoming >= 0 ? upcoming : this.workouts.length - 1;
  }

  private buildWeeks(): WeekGroup[] {
    const start = this.selectedProgram?.startDate ?? this.workouts[0]?.date ?? null;
    const groups = new Map<string, WeekGroup>();
    for (const workout of this.workouts) {
      if (!workout.date) continue;
      const monday = startOfWeek(fromIsoDate(workout.date));
      const key = toIsoDate(monday);
      if (!groups.has(key)) {
        const number = start
          ? Math.floor((monday.getTime() - startOfWeek(fromIsoDate(start)).getTime()) / (7 * 86400000)) + 1
          : groups.size + 1;
        groups.set(key, { label: String(number), from: key, to: toIsoDate(addDays(monday, 6)), workouts: [] });
      }
      groups.get(key)!.workouts.push(workout);
    }
    return [...groups.values()];
  }

  status(workout: ClientWorkoutEntry): CoachWorkoutStatus {
    if (workout.completed) return 'done';
    if (workout.startedAt) return 'inProgress';
    if (workout.date && workout.date < this.todayIso) return 'missed';
    return 'planned';
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

  isSelected(workout: ClientWorkoutEntry): boolean {
    return this.selected?.userWorkoutId === workout.userWorkoutId;
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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
    const now = this.values(row);
    if (!now) return true;
    const o = row.original;
    return (
      now.targetRepetitions !== o.targetRepetitions ||
      now.targetWeightKg !== o.targetWeightKg ||
      now.restSeconds !== o.restSeconds ||
      now.actualRepetitions !== o.actualRepetitions ||
      now.actualWeightKg !== o.actualWeightKg ||
      now.completed !== o.completed ||
      now.notes !== o.notes
    );
  }

  isInvalid(row: EditableSet): boolean {
    return this.values(row) === null;
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

  /** Az első sorozat cél értékei (ismétlés, súly, pihenő) a többi, nem teljesített sorozatra. */
  fillDown(entry: ExerciseSets): void {
    const source = entry.sets[0];
    if (!source) return;
    for (const row of entry.sets.slice(1)) {
      if (row.completed) continue;
      row.targetRepetitions = source.targetRepetitions;
      row.targetWeightKg = source.targetWeightKg;
      row.restSeconds = source.restSeconds;
    }
  }

  addSet(entry: ExerciseSets): void {
    if (this.setBusy) return;
    const last = entry.sets[entry.sets.length - 1];
    const prefill = last ? this.values(last) : null;
    this.setBusy = true;
    this.workspace
      .addClientSet(entry.exercise.userWorkoutExerciseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
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
          save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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
    this.saving = true;
    concat(...changed.map((row) => this.workspace.saveClientSet(row.id, this.values(row)!)))
      .pipe(toArray(), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          for (const row of changed) row.original = this.values(row)!;
          for (const entry of this.exerciseSets) entry.exercise.setsCompleted = this.completedCount(entry);
          this.refreshWorkoutTotals();
          this.showMessage('coachWorkspace.client.saved', 'success');
          after?.();
        },
        error: (error) => {
          this.saving = false;
          this.showError(error, 'coachWorkspace.client.saveError');
          for (const entry of this.exerciseSets) this.loadSets(entry, true);
        },
      });
  }

  discardChanges(): void {
    for (const entry of this.exerciseSets) {
      for (const row of entry.sets) {
        const o = row.original;
        row.targetRepetitions = o.targetRepetitions;
        row.targetWeightKg = o.targetWeightKg;
        row.restSeconds = o.restSeconds;
        row.actualRepetitions = o.actualRepetitions;
        row.actualWeightKg = o.actualWeightKg;
        row.completed = o.completed;
        row.notes = o.notes;
      }
    }
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
    const target = toInt(row.targetRepetitions);
    if (target === null || target === undefined || target < 1) return null;
    const weight = toNumber(row.targetWeightKg);
    const actualWeight = toNumber(row.actualWeightKg);
    const actualReps = toInt(row.actualRepetitions);
    const rest = toInt(row.restSeconds);
    if (weight === undefined || actualWeight === undefined || actualReps === undefined || rest === undefined) return null;
    if ((weight ?? 0) < 0 || (actualWeight ?? 0) < 0 || (actualReps !== null && actualReps < 1) || (rest ?? 0) < 0) {
      return null;
    }
    const notes = (row.notes ?? '').trim();
    return {
      targetRepetitions: target,
      targetWeightKg: weight,
      actualRepetitions: actualReps,
      actualWeightKg: actualWeight,
      restSeconds: rest,
      notes: notes === '' ? null : notes,
      completed: !!row.completed,
    };
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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

// ------------------------------------------------------------
// Tiszta segédfüggvények
// ------------------------------------------------------------

function groupWorkouts(rows: ClientProgramRow[]): ClientWorkoutEntry[] {
  const byId = new Map<number, ClientWorkoutEntry>();
  for (const row of rows) {
    let workout = byId.get(row.user_workout_id);
    if (!workout) {
      workout = {
        userWorkoutId: row.user_workout_id,
        workoutId: row.workout_id,
        name: row.workout_name ?? '',
        date: row.scheduled_date ?? null,
        dayIndex: row.program_day_index ?? null,
        completed: !!row.workout_completed,
        startedAt: row.workout_started_at ?? null,
        feedback: row.workout_feedback ?? null,
        exercises: [],
        setsTotal: 0,
        setsCompleted: 0,
      };
      byId.set(row.user_workout_id, workout);
    }
    const exercise: ClientExerciseEntry = {
      userWorkoutExerciseId: row.user_workout_exercise_id,
      workoutExerciseId: row.workout_exercise_id,
      exerciseId: row.exercise_id,
      name: row.exercise_name ?? '',
      order: row.exercise_order,
      completed: !!row.exercise_completed,
      setsTotal: Number(row.sets_done ?? 0),
      setsCompleted: Number(row.sets_completed ?? 0),
      feedback: row.exercise_feedback ?? null,
      templateSets: row.template_sets ?? null,
      templateRepetitions: row.template_repetitions ?? null,
      templateRestSeconds: row.template_rest_seconds ?? null,
    };
    workout.exercises.push(exercise);
    workout.setsTotal += exercise.setsTotal;
    workout.setsCompleted += exercise.setsCompleted;
  }
  const list = [...byId.values()];
  for (const workout of list) workout.exercises.sort((a, b) => a.order - b.order);
  return list.sort(
    (a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || (a.dayIndex ?? 0) - (b.dayIndex ?? 0),
  );
}

function toEditable(set: ClientWorkoutSet): EditableSet {
  const original: ClientSetValues = {
    targetRepetitions: set.targetRepetitions,
    targetWeightKg: set.targetWeightKg === null || set.targetWeightKg === undefined ? null : Number(set.targetWeightKg),
    restSeconds: set.restSeconds ?? null,
    actualRepetitions: set.actualRepetitions ?? null,
    actualWeightKg: set.actualWeightKg === null || set.actualWeightKg === undefined ? null : Number(set.actualWeightKg),
    completed: !!set.completed,
    notes: set.notes && set.notes.trim() !== '' ? set.notes : null,
  };
  return {
    id: set.id,
    setNumber: set.setNumber,
    targetRepetitions: original.targetRepetitions,
    targetWeightKg: original.targetWeightKg,
    restSeconds: original.restSeconds,
    actualRepetitions: original.actualRepetitions,
    actualWeightKg: original.actualWeightKg,
    completed: original.completed,
    notes: original.notes,
    original,
  };
}

/** Üres → null, egész → szám, egyéb → undefined (érvénytelen). */
function toInt(value: number | string | null): number | null | undefined {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function toNumber(value: number | string | null): number | null | undefined {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
