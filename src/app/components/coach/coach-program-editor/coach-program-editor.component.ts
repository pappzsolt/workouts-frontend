import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, concat, forkJoin, last, switchMap, takeUntil, tap, toArray } from 'rxjs';

import { SHARED_IMPORTS } from '../../shared/shared-imports';
import {
  CoachWorkspaceService,
  addDays,
  fromIsoDate,
  toIsoDate,
} from '../../../services/coach/coach-workspace.service';
import type {
  CoachClientOverview,
  CoachExerciseSearchItem,
  CoachProgram,
  CoachProgramDayLink,
  CoachProgramDetailsInput,
  CoachProgramWorkout,
  CoachWorkoutSummary,
} from '../../../models/coach-workspace.model';
import { DIFFICULTY_OPTIONS, WEEKDAY_KEYS, errorText } from '../coach-ui';
import { ExercisePickerComponent } from '../exercise-picker/exercise-picker.component';
import { matchesSearch } from '../../shared/components/app-search/search-match';

interface DayCell {
  day: number;
  date: Date | null;
  workout: CoachProgramWorkout | null;
  link: CoachProgramDayLink | null;
  label: string;
}

interface EditableExercise {
  id: number;
  name: string;
  sets: number;
  repetitions: number;
  restSeconds: number;
  original: { sets: number; repetitions: number; restSeconds: number };
}

/**
 * Programszerkesztő egy oldalon: program adatai, napok rácsa, a kiválasztott
 * nap edzése (gyakorlatok előírt értékei), új vagy másolt edzés felvétele egy
 * üres napra, és a program kiosztása ügyfeleknek.
 */
@Component({
  selector: 'app-coach-program-editor',
  standalone: true,
  imports: [...SHARED_IMPORTS, ExercisePickerComponent],
  templateUrl: './coach-program-editor.component.html',
})
export class CoachProgramEditorComponent implements OnInit {
  private readonly workspace = inject(CoachWorkspaceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly programLoadCancelled$ = new Subject<void>();
  private readonly assignmentLoadCancelled$ = new Subject<void>();

  readonly weekdayKeys = WEEKDAY_KEYS;
  readonly difficultyOptions = DIFFICULTY_OPTIONS;

  programId: number | null = null;
  loading = false;
  savingDetails = false;
  busy = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  messageParams: Record<string, unknown> = {};

  /** Az ügyfél oldalról indított új program: létrehozás után rögtön az ügyfélé. */
  newForUserId: number | null = null;

  // Több edzés egyszerre az Edzéstárból
  multiOpen = false;
  multiFilter = '';
  multiSelected: number[] = [];

  // Program másolása
  copyOpen = false;
  copyName = '';
  copyStart = '';
  copyUserId: number | null = null;

  form: CoachProgramDetailsInput = {
    programName: '',
    programDescription: '',
    durationDays: 28,
    difficultyLevel: 'BEGINNER',
    startDate: toIsoDate(new Date()),
  };

  program: CoachProgram | null = null;
  cells: DayCell[] = [];
  leadingBlanks: number[] = [];
  selectedDay = 1;
  pendingDay: number | null = null;

  // Kiválasztott nap edzése
  rows: EditableExercise[] = [];
  /** Áthelyezés céldátuma (YYYY-MM-DD); a programnap ebből számolódik. */
  moveDate = '';
  confirmRemove = false;

  // Ugyanaz az edzés másik napra / hetente; a további nap dátuma (YYYY-MM-DD)
  extraDate = '';
  confirmRepeat = false;

  // Üres nap: új edzés vagy edzés az edzéstárból
  emptyMode: 'new' | 'library' = 'new';
  myWorkouts: CoachWorkoutSummary[] = [];
  libraryFilter = '';
  copySourceId: number | null = null;
  workoutName = '';
  pendingExercises: CoachExerciseSearchItem[] = [];

  // Kiosztás
  clients: CoachClientOverview[] = [];
  assignedIds = new Set<number>();
  toAssign = new Set<number>();
  /** Kereső a kiosztható ügyfelek listájához. */
  clientFilter = '';
  pendingRevokeClient: CoachClientOverview | null = null;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.programLoadCancelled$.next();
      this.assignmentLoadCancelled$.next();
      this.loading = false;
      this.pendingDay = null;
      const raw = params.get('id');
      if (raw === null || raw === 'new') {
        this.programId = null;
        this.program = null;
        this.rows = [];
        this.clients = [];
        this.assignedIds = new Set();
        this.toAssign = new Set();
        this.pendingRevokeClient = null;
        this.form = {
          programName: '', programDescription: '', durationDays: 28,
          difficultyLevel: 'BEGINNER', startDate: toIsoDate(new Date()),
        };
        const forUser = Number(this.route.snapshot.queryParamMap.get('userId'));
        this.newForUserId = Number.isInteger(forUser) && forUser > 0 ? forUser : null;
        if (this.newForUserId !== null) this.loadClientsOnly();
        this.buildCells();
        return;
      }
      const id = Number(raw);
      if (!Number.isInteger(id) || id <= 0) {
        void this.router.navigate(['/coach/programs']);
        return;
      }
      if (this.programId !== id) {
        this.program = null;
        this.cells = [];
        this.rows = [];
        this.clients = [];
        this.assignedIds = new Set();
        this.toAssign = new Set();
        this.pendingRevokeClient = null;
      }
      this.programId = id;
      this.loadProgram(null);
    });
  }

  // ----------------------------------------------------------
  // Betöltés
  // ----------------------------------------------------------

  private loadProgram(
    selectDay: number | null,
    preserveDrafts = false,
    submittedForm?: CoachProgramDetailsInput,
  ): void {
    if (this.programId === null) return;
    this.programLoadCancelled$.next();
    this.assignmentLoadCancelled$.next();
    const programId = this.programId;
    this.loading = true;
    forkJoin({
      program: this.workspace.getProgram(programId),
      links: this.workspace.getProgramDays(programId),
    })
      .pipe(takeUntil(this.programLoadCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ program, links }) => {
          if (this.programId !== programId) return;
          // Read drafts when the response arrives, including edits made while loading.
          const draftWorkoutId = preserveDrafts ? this.selectedCell?.workout?.workoutId : undefined;
          const draftRows = preserveDrafts ? this.rows.filter((row) => this.isChanged(row)) : [];
          const emptyDraft = preserveDrafts && this.selectedCell && !this.selectedCell.workout
            ? { workoutName: this.workoutName, pendingExercises: [...this.pendingExercises],
                copySourceId: this.copySourceId, emptyMode: this.emptyMode, libraryFilter: this.libraryFilter }
            : null;
          const metadataDraft: Partial<CoachProgramDetailsInput> = {};
          if (submittedForm) {
            for (const key of Object.keys(submittedForm) as (keyof CoachProgramDetailsInput)[]) {
              if (this.form[key] !== submittedForm[key]) {
                Object.assign(metadataDraft, { [key]: this.form[key] });
              }
            }
          }
          this.program = program;
          this.form = {
            programName: program.programName ?? '',
            programDescription: program.programDescription ?? '',
            durationDays: program.durationDays ?? 28,
            difficultyLevel: program.difficultyLevel ?? 'BEGINNER',
            startDate: program.startDate ?? toIsoDate(new Date()),
            ...metadataDraft,
          };
          this.buildCells(links);
          this.loadAssignment();
          const firstWorkoutDay = this.cells.find((cell) => cell.workout)?.day ?? 1;
          this.openDay(selectDay ?? (this.cells.some((c) => c.day === this.selectedDay) ? this.selectedDay : firstWorkoutDay));
          if (draftWorkoutId !== undefined && this.selectedCell?.workout?.workoutId === draftWorkoutId) {
            for (const row of this.rows) {
              const draft = draftRows.find((item) => item.id === row.id);
              if (draft) {
                for (const key of ['sets', 'repetitions', 'restSeconds'] as const) {
                  if (Number(draft[key]) !== Number(draft.original[key])) row[key] = draft[key];
                }
              }
            }
          } else if (emptyDraft && this.selectedCell && !this.selectedCell.workout) {
            Object.assign(this, emptyDraft);
          }
          this.loading = false;
        },
        error: (error) => {
          if (this.programId !== programId) return;
          this.loading = false;
          this.showError(error, 'coachWorkspace.loadError');
        },
      });
  }

  private buildCells(links: CoachProgramDayLink[] = []): void {
    const workoutsByLinkId = new Map<number, CoachProgramWorkout>();
    const workoutsById = new Map<number, CoachProgramWorkout>();
    for (const workout of this.program?.workouts ?? []) {
      workoutsByLinkId.set(workout.programWorkoutId, workout);
      if (!workoutsById.has(workout.workoutId)) workoutsById.set(workout.workoutId, workout);
    }
    const byDay = new Map<number, CoachProgramDayLink>();
    for (const link of links) byDay.set(link.dayIndex, link);

    const duration = Math.max(1, Number(this.form.durationDays) || 1);
    const start = this.form.startDate ? fromIsoDate(this.form.startDate) : null;
    const prefix = commonPrefix((this.program?.workouts ?? []).map((workout) => workout.name));
    this.cells = Array.from({ length: duration }, (_, index) => {
      const day = index + 1;
      const link = byDay.get(day) ?? null;
      const workout = link
        ? workoutsByLinkId.get(link.id) ?? workoutsById.get(link.workoutId) ?? null
        : null;
      return {
        day,
        date: start ? addDays(start, index) : null,
        workout,
        link,
        label: workout ? shortName(workout.name, prefix) : '',
      };
    });
    // A rács hétfővel kezdődik: a kezdőnap előtti üres helyek.
    const offset = start ? (start.getDay() + 6) % 7 : 0;
    this.leadingBlanks = Array.from({ length: offset }, (_, i) => i);
  }

  private loadAssignment(): void {
    if (this.programId === null) return;
    this.assignmentLoadCancelled$.next();
    const programId = this.programId;
    const today = toIsoDate(new Date());
    forkJoin({
      overview: this.workspace.getOverview(today, today),
      assigned: this.workspace.getAssignedUserIds(programId),
    })
      .pipe(takeUntil(this.assignmentLoadCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ overview, assigned }) => {
          if (this.programId !== programId) return;
          this.clients = overview.clients;
          this.assignedIds = new Set(assigned);
          this.toAssign = new Set();
        },
        error: () => {
          if (this.programId !== programId) return;
          this.clients = [];
        },
      });
  }

  // ----------------------------------------------------------
  // Program adatai
  // ----------------------------------------------------------

  saveDetails(): void {
    if (this.savingDetails || this.busy || this.loading ||
        (this.programId !== null && this.program?.programId !== this.programId)) return;
    const name = this.form.programName.trim();
    const duration = Number(this.form.durationDays);
    if (!name || !Number.isInteger(duration) || duration < 1 || duration > 365 || !this.form.startDate) {
      this.showMessage('coachWorkspace.editor.detailsInvalid', 'error');
      return;
    }
    if (duration < this.selectedDay && (this.changedCount > 0 ||
        (!this.selectedCell?.workout && (this.workoutName.trim() || this.pendingExercises.length || this.copySourceId !== null)))) {
      this.showMessage('coachWorkspace.editor.saveBeforeShortening', 'error');
      return;
    }
    const submittedForm = { ...this.form };
    const details: CoachProgramDetailsInput = {
      programName: name,
      programDescription: this.form.programDescription?.trim() ?? '',
      durationDays: duration,
      difficultyLevel: this.form.difficultyLevel,
      startDate: this.form.startDate,
    };
    this.savingDetails = true;

    if (this.programId === null) {
      this.workspace
        .createProgram(details)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (id) => {
            const userId = this.newForUserId;
            if (userId === null) {
              this.savingDetails = false;
              this.showMessage('coachWorkspace.editor.created', 'success');
              void this.router.navigate(['/coach/programs', id], { replaceUrl: true });
              return;
            }
            // Ügyfélnek készülő program: azonnal az ügyfélé lesz.
            this.workspace
              .assignProgram(userId, id)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: () => {
                  this.savingDetails = false;
                  this.showMessage('coachWorkspace.editor.createdForClient', 'success', { name: this.newForUserName });
                  void this.router.navigate(['/coach/programs', id], { replaceUrl: true });
                },
                error: (error) => {
                  this.savingDetails = false;
                  this.showError(error, 'coachWorkspace.client.assignError');
                  void this.router.navigate(['/coach/programs', id], { replaceUrl: true });
                },
              });
          },
          error: (error) => {
            this.savingDetails = false;
            this.showError(error, 'coachWorkspace.editor.saveError');
          },
        });
      return;
    }

    this.workspace
      .updateProgram(this.programId, details)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingDetails = false;
          this.showMessage('coachWorkspace.editor.saved', 'success');
          this.loadProgram(this.selectedDay, true, submittedForm);
        },
        error: (error) => {
          this.savingDetails = false;
          this.showError(error, 'coachWorkspace.editor.saveError');
        },
      });
  }

  // ----------------------------------------------------------
  // Napok
  // ----------------------------------------------------------

  get selectedCell(): DayCell | null {
    return this.cells.find((cell) => cell.day === this.selectedDay) ?? null;
  }

  selectDay(day: number): void {
    if (day === this.selectedDay || this.busy || this.loading || !this.cells.some((cell) => cell.day === day)) return;
    const hasNewWorkout = !this.selectedCell?.workout &&
      (!!this.workoutName.trim() || this.pendingExercises.length > 0 || this.copySourceId !== null);
    if (this.changedCount > 0 || hasNewWorkout) {
      this.pendingDay = day;
      return;
    }
    this.openDay(day);
  }

  cancelDayChange(): void {
    this.pendingDay = null;
  }

  discardAndChangeDay(): void {
    if (this.pendingDay === null || this.busy || this.loading) return;
    this.openDay(this.pendingDay);
  }

  private openDay(day: number): void {
    this.pendingDay = null;
    this.selectedDay = day;
    this.confirmRemove = false;
    this.confirmRepeat = false;
    this.moveDate = this.form.startDate ? this.dateForDay(day) : '';
    this.extraDate = this.form.startDate ? this.dateForDay(Math.min(day + 7, this.cells.length || day)) : '';
    const cell = this.selectedCell;
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
    if (cell && !cell.workout) {
      this.workoutName = '';
      this.pendingExercises = [];
      this.copySourceId = null;
      this.libraryFilter = '';
      if (this.myWorkouts.length === 0) this.loadMyWorkouts();
    }
  }

  dayAriaLabel(cell: DayCell): string {
    return cell.workout ? `${cell.day}: ${cell.workout.name}` : `${cell.day}`;
  }

  private loadMyWorkouts(): void {
    this.workspace
      .getMyWorkouts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (workouts) => (this.myWorkouts = workouts), error: () => (this.myWorkouts = []) });
  }

  private dateForDay(day: number): string {
    return toIsoDate(addDays(fromIsoDate(this.form.startDate), day - 1));
  }

  /** A program első és utolsó napjának dátuma a dátummezők min/max értékéhez. */
  get firstDate(): string {
    return this.form.startDate ? this.dateForDay(1) : '';
  }

  get lastDate(): string {
    return this.form.startDate ? this.dateForDay(this.cells.length || 1) : '';
  }

  /**
   * A dátumhoz tartozó programnap (day_index, 1-től): a kezdőnaptól eltelt napok + 1.
   * Üres vagy hibás dátumnál NaN. Naptári napokat számol, így az óraátállítás nem zavarja.
   */
  dayForDate(value: string): number {
    if (!this.form.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return NaN;
    const [sy, sm, sd] = this.form.startDate.split('-').map(Number);
    const [y, m, d] = value.split('-').map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(sy, sm - 1, sd)) / 86_400_000) + 1;
  }

  // ----------------------------------------------------------
  // Kiválasztott edzés
  // ----------------------------------------------------------

  isChanged(row: EditableExercise): boolean {
    return (
      Number(row.sets) !== row.original.sets ||
      Number(row.repetitions) !== row.original.repetitions ||
      Number(row.restSeconds) !== row.original.restSeconds
    );
  }

  get changedCount(): number {
    return this.rows.filter((row) => this.isChanged(row)).length;
  }

  savePrescriptions(): void {
    const workout = this.selectedCell?.workout;
    if (!workout || this.busy || this.savingDetails || this.loading) return;
    const changed = this.rows.filter((row) => this.isChanged(row));
    if (changed.length === 0) return;
    const invalid = changed.find(
      (row) =>
        !Number.isInteger(Number(row.sets)) || Number(row.sets) < 1 || Number(row.sets) > 20 ||
        !Number.isInteger(Number(row.repetitions)) || Number(row.repetitions) < 1 || Number(row.repetitions) > 200 ||
        !Number.isInteger(Number(row.restSeconds)) || Number(row.restSeconds) < 0 || Number(row.restSeconds) > 3600,
    );
    if (invalid) {
      this.showMessage('coachWorkspace.editor.prescriptionInvalid', 'error');
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
    this.run(
      concat(...requests).pipe(toArray()),
      'coachWorkspace.editor.prescriptionSaved',
      this.selectedDay,
      true,
    );
  }

  moveWorkout(): void {
    const link = this.selectedCell?.link;
    const target = this.dayForDate(this.moveDate);
    if (!link || !Number.isInteger(target) || target < 1 || target === link.dayIndex) return;
    if (target > this.cells.length) {
      this.showMessage('coachWorkspace.editor.dayOutOfRange', 'error');
      return;
    }
    this.run(this.workspace.moveWorkoutToDay(link.id, target), 'coachWorkspace.editor.moved', target);
  }

  removeWorkout(): void {
    const link = this.selectedCell?.link;
    if (!link) return;
    this.confirmRemove = false;
    this.run(this.workspace.removeWorkoutFromDay(link.id), 'coachWorkspace.editor.removed', this.selectedDay);
  }

  // ----------------------------------------------------------
  // Üres nap: új vagy másolt edzés
  // ----------------------------------------------------------

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
    if (this.programId === null || this.busy) return;
    const name = this.workoutName.trim();
    if (!name || this.pendingExercises.length === 0) {
      this.showMessage('coachWorkspace.editor.newWorkoutInvalid', 'error');
      return;
    }
    const programId = this.programId;
    const day = this.selectedDay;
    const exercises = [...this.pendingExercises];
    this.run(
      this.workspace.createWorkout(name, this.dateForDay(day)).pipe(
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

  /** Az edzéstár szűrt listája; a programban már szereplő edzések elöl. */
  get libraryWorkouts(): CoachWorkoutSummary[] {
    const term = this.libraryFilter.trim().toLowerCase();
    const inProgram = new Set((this.program?.workouts ?? []).map((w) => w.workoutId));
    return this.myWorkouts
      .filter((workout) => !term || workout.name.toLowerCase().includes(term))
      .sort((a, b) => Number(inProgram.has(b.id)) - Number(inProgram.has(a.id)) || a.name.localeCompare(b.name));
  }

  isInProgram(workoutId: number): boolean {
    return (this.program?.workouts ?? []).some((workout) => workout.workoutId === workoutId);
  }

  /** A kiválasztott edzéstári edzés ugyanazzal a gyakorlatlistával kerül a napra (nem másolat). */
  linkLibraryWorkout(): void {
    if (this.programId === null || this.copySourceId === null || this.busy) return;
    const day = this.selectedDay;
    this.run(
      this.workspace.addWorkoutToDay(this.programId, this.copySourceId, day),
      'coachWorkspace.editor.workoutLinked',
      day,
    );
  }

  /** Önálló másolat a napra, saját névvel; az eredeti edzés változatlan marad. */
  copyWorkoutToDay(): void {
    if (this.programId === null || this.busy) return;
    const name = this.workoutName.trim();
    if (this.copySourceId === null || !name) {
      this.showMessage('coachWorkspace.editor.copyInvalid', 'error');
      return;
    }
    const day = this.selectedDay;
    this.run(
      this.workspace.copyWorkoutToDay(this.copySourceId, this.programId, name, this.dateForDay(day), day),
      'coachWorkspace.editor.workoutCopied',
      day,
    );
  }

  onCopySourceChange(sourceId: number | null): void {
    this.copySourceId = sourceId;
    const source = this.myWorkouts.find((workout) => workout.id === sourceId);
    if (source) this.workoutName = source.name;
  }

  // ----------------------------------------------------------
  // Ugyanaz az edzés több napon
  // ----------------------------------------------------------

  /** A kiválasztott nap után hetente ugyanarra a hétnapra eső, még üres napok. */
  get weeklyRepeatDays(): number[] {
    const days: number[] = [];
    for (let day = this.selectedDay + 7; day <= this.cells.length; day += 7) {
      if (!this.cells[day - 1]?.link) days.push(day);
    }
    return days;
  }

  get weeklyRepeatSkipped(): number {
    let skipped = 0;
    for (let day = this.selectedDay + 7; day <= this.cells.length; day += 7) {
      if (this.cells[day - 1]?.link) skipped++;
    }
    return skipped;
  }

  repeatWeekly(): void {
    const workout = this.selectedCell?.workout;
    const days = this.weeklyRepeatDays;
    if (this.programId === null || !workout || days.length === 0 || this.busy) return;
    const programId = this.programId;
    this.confirmRepeat = false;
    this.run(
      concat(...days.map((day) => this.workspace.addWorkoutToDay(programId, workout.workoutId, day))).pipe(toArray()),
      'coachWorkspace.editor.repeated',
      this.selectedDay,
      true,
    );
  }

  /** Ugyanez az edzés egy további napra is. */
  addToAnotherDay(): void {
    const workout = this.selectedCell?.workout;
    const target = this.dayForDate(this.extraDate);
    if (this.programId === null || !workout || this.busy) return;
    if (!Number.isInteger(target) || target < 1 || target > this.cells.length) {
      this.showMessage('coachWorkspace.editor.dayOutOfRange', 'error');
      return;
    }
    if (this.cells[target - 1]?.link) {
      this.showMessage('coachWorkspace.editor.dayTaken', 'error');
      return;
    }
    this.run(
      this.workspace.addWorkoutToDay(this.programId, workout.workoutId, target),
      'coachWorkspace.editor.addedToDay',
      this.selectedDay,
      true,
    );
  }

  /** A kiosztott ügyfelek a kiválasztott napon (link a sorozataikhoz, súlyaikhoz). */
  get selectedDayClients(): { client: CoachClientOverview; date: string }[] {
    if (!this.form.startDate) return [];
    const date = this.dateForDay(this.selectedDay);
    return this.assignedClients.map((client) => ({ client, date }));
  }

  get newForUserName(): string {
    return this.clients.find((client) => client.userId === this.newForUserId)?.username ?? '';
  }

  private loadClientsOnly(): void {
    this.assignmentLoadCancelled$.next();
    const today = toIsoDate(new Date());
    this.workspace
      .getOverview(today, today)
      .pipe(takeUntil(this.assignmentLoadCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (overview) => (this.clients = overview.clients), error: () => (this.clients = []) });
  }

  // ----------------------------------------------------------
  // Sablon: sorrend, átvezetés, másolat
  // ----------------------------------------------------------

  /** Sablon szintű sorrend: minden ügyfél az új sorrendet látja. */
  moveRow(index: number, direction: -1 | 1): void {
    const workout = this.selectedCell?.workout;
    const row = this.rows[index];
    const target = index + direction;
    if (!workout || !row || target < 0 || target >= this.rows.length || this.busy) return;
    if (this.changedCount > 0) {
      this.showMessage('coachWorkspace.editor.saveBeforeReorder', 'error');
      return;
    }
    this.run(
      this.workspace.moveTemplateExercise(workout.workoutId, row.id, target),
      'coachWorkspace.editor.reordered',
      this.selectedDay,
    );
  }

  /** A sablon átvezetése a még el nem kezdett ügyfél-edzésekre (a súlyok maradnak). */
  applyTemplateToClients(): void {
    const workout = this.selectedCell?.workout;
    if (!workout || this.busy) return;
    if (this.changedCount > 0) {
      this.showMessage('coachWorkspace.editor.saveBeforeApply', 'error');
      return;
    }
    this.busy = true;
    this.workspace
      .applyTemplate(workout.workoutId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.busy = false;
          this.showMessage('coachWorkspace.editor.templateApplied', 'success', { ...result });
        },
        error: (error) => {
          this.busy = false;
          this.showError(error, 'coachWorkspace.editor.actionError');
        },
      });
  }

  /** Szerkeszthető másolat az Edzéstárban (a programban lévő edzés gyakorlatlistája zárolt). */
  copyToLibrary(): void {
    const workout = this.selectedCell?.workout;
    if (!workout || this.busy) return;
    this.busy = true;
    this.workspace
      .copyWorkout(workout.workoutId, `${workout.name} (2)`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (id) => {
          this.busy = false;
          void this.router.navigate(['/coach/workouts', id, 'edit']);
        },
        error: (error) => {
          this.busy = false;
          this.showError(error, 'coachWorkspace.editor.actionError');
        },
      });
  }

  // ----------------------------------------------------------
  // Több edzés egyszerre
  // ----------------------------------------------------------

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

  /** A kiválasztott naptól kezdve a következő szabad napok, a kijelölés sorrendjében. */
  get multiTargetDays(): number[] {
    const days: number[] = [];
    for (const cell of this.cells) {
      if (days.length === this.multiSelected.length) break;
      if (cell.day >= this.selectedDay && !cell.link) days.push(cell.day);
    }
    return days;
  }

  addMultiple(): void {
    if (this.programId === null || this.busy || this.multiSelected.length === 0) return;
    const days = this.multiTargetDays;
    if (days.length < this.multiSelected.length) {
      this.showMessage('coachWorkspace.editor.notEnoughFreeDays', 'error');
      return;
    }
    const programId = this.programId;
    const pairs = this.multiSelected.map((workoutId, i) => ({ workoutId, day: days[i] }));
    this.multiOpen = false;
    this.run(
      concat(...pairs.map((pair) => this.workspace.addWorkoutToDay(programId, pair.workoutId, pair.day))).pipe(toArray()),
      'coachWorkspace.editor.multiAdded',
      pairs[0].day,
    );
  }

  // ----------------------------------------------------------
  // Program másolása
  // ----------------------------------------------------------

  openCopy(): void {
    this.copyOpen = true;
    this.copyName = `${this.form.programName} (2)`;
    this.copyStart = toIsoDate(new Date());
    this.copyUserId = null;
  }

  confirmCopy(): void {
    if (this.programId === null || this.busy) return;
    if (!this.copyName.trim() || !this.copyStart) {
      this.showMessage('coachWorkspace.editor.copyProgramInvalid', 'error');
      return;
    }
    this.busy = true;
    this.workspace
      .copyProgram(this.programId, this.copyName.trim(), this.copyStart, this.copyUserId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (id) => {
          this.busy = false;
          this.copyOpen = false;
          this.showMessage('coachWorkspace.editor.programCopied', 'success');
          void this.router.navigate(['/coach/programs', id]);
        },
        error: (error) => {
          this.busy = false;
          this.showError(error, 'coachWorkspace.editor.actionError');
        },
      });
  }

  /** Hány napon szerepel a kiválasztott edzés (a közös előírások miatt). */
  get selectedWorkoutDayCount(): number {
    const workoutId = this.selectedCell?.workout?.workoutId;
    return workoutId == null ? 0 : this.cells.filter((cell) => cell.link?.workoutId === workoutId).length;
  }

  // ----------------------------------------------------------
  // Kiosztás ügyfeleknek
  // ----------------------------------------------------------

  toggleAssign(userId: number, checked: boolean): void {
    const next = new Set(this.toAssign);
    if (checked) next.add(userId);
    else next.delete(userId);
    this.toAssign = next;
  }

  /** Az eddig ki nem osztott ügyfelek a kereső szerint (név vagy e-mail). */
  get filteredUnassignedClients(): CoachClientOverview[] {
    return this.unassignedClients.filter((client) => matchesSearch(this.clientFilter, client.username, client.email));
  }

  /** A szűrt listában látható összes ügyfél kijelölése (a korábbi kijelölés megmarad). */
  selectVisibleClients(): void {
    const next = new Set(this.toAssign);
    for (const client of this.filteredUnassignedClients) next.add(client.userId);
    this.toAssign = next;
  }

  clearClientSelection(): void {
    this.toAssign = new Set();
  }

  /** Monogram a névből (pl. "coach_user01" → "CU", "Andi" → "AN"). */
  initials(client: CoachClientOverview): string {
    const parts = (client.username ?? '').trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toLocaleUpperCase();
    return (parts[0] ?? '?').slice(0, 2).toLocaleUpperCase();
  }

  get assignedClients(): CoachClientOverview[] {
    return this.clients.filter((client) => this.assignedIds.has(client.userId));
  }

  get unassignedClients(): CoachClientOverview[] {
    return this.clients.filter((client) => !this.assignedIds.has(client.userId));
  }

  askRevoke(client: CoachClientOverview): void {
    if (this.programId === null || this.busy || !this.assignedIds.has(client.userId)) return;
    this.pendingRevokeClient = client;
  }

  cancelRevoke(): void {
    if (!this.busy) this.pendingRevokeClient = null;
  }

  confirmRevoke(): void {
    const client = this.pendingRevokeClient;
    const programId = this.programId;
    if (!client || programId === null || this.busy || !this.assignedIds.has(client.userId)) return;
    this.busy = true;
    this.workspace.revokeProgram(programId, client.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy = false;
          this.pendingRevokeClient = null;
          this.assignedIds = new Set([...this.assignedIds].filter((id) => id !== client.userId));
          this.clients = this.clients.map((item) => item.userId === client.userId ? {
            ...item,
            programs: item.programs.filter((program) => program.programId !== programId),
            workouts: item.workouts.filter((workout) => workout.programId !== programId),
          } : item);
          this.showMessage('coachWorkspace.client.revoked', 'success');
        },
        error: (error) => {
          this.busy = false;
          this.pendingRevokeClient = null;
          this.showError(error, 'coachWorkspace.client.revokeError');
        },
      });
  }

  assignSelected(): void {
    if (this.programId === null || this.toAssign.size === 0 || this.busy) return;
    const programId = this.programId;
    const ids = [...this.toAssign];
    this.busy = true;
    concat(...ids.map((userId) => this.workspace.assignProgram(userId, programId)))
      .pipe(toArray(), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy = false;
          this.showMessage('coachWorkspace.editor.assigned', 'success');
          this.loadAssignment();
        },
        error: (error) => {
          this.busy = false;
          this.showError(error, 'coachWorkspace.client.assignError');
          this.loadAssignment();
        },
      });
  }

  // ----------------------------------------------------------
  // Segédek
  // ----------------------------------------------------------

  private run(operation: Observable<unknown>, successKey: string, selectDay: number, preserveDrafts = false): void {
    this.busy = true;
    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => undefined,
      error: (error) => {
        this.busy = false;
        this.showError(error, 'coachWorkspace.editor.actionError');
        this.loadProgram(this.selectedDay, preserveDrafts);
      },
      complete: () => {
        this.busy = false;
        this.myWorkouts = [];
        this.showMessage(successKey, 'success');
        this.loadProgram(selectDay, preserveDrafts);
      },
    });
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

/** Az edzésnevek közös eleje (szóhatárig), pl. "workouts-Workout-". */
function commonPrefix(names: string[]): string {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length < 2) return '';
  let prefix = unique[0];
  for (const name of unique.slice(1)) {
    while (prefix && !name.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  const cut = Math.max(prefix.lastIndexOf(' '), prefix.lastIndexOf('-'), prefix.lastIndexOf('_'));
  return cut >= 0 ? prefix.slice(0, cut + 1) : '';
}

/** A rácsban a név közös előtag nélküli része, hogy a lényeg látsszon. */
function shortName(name: string, prefix: string): string {
  const rest = prefix && name.startsWith(prefix) ? name.slice(prefix.length).trim() : name;
  return rest || name;
}
