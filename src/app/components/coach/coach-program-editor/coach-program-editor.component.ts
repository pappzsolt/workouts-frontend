import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Observable,
  Subject,
  concat,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  last,
  of,
  switchMap,
  toArray,
} from 'rxjs';

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
  imports: [...SHARED_IMPORTS],
  templateUrl: './coach-program-editor.component.html',
})
export class CoachProgramEditorComponent implements OnInit {
  private readonly workspace = inject(CoachWorkspaceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly weekdayKeys = WEEKDAY_KEYS;
  readonly difficultyOptions = DIFFICULTY_OPTIONS;

  programId: number | null = null;
  loading = false;
  savingDetails = false;
  busy = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

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

  // Kiválasztott nap edzése
  rows: EditableExercise[] = [];
  moveTarget = 1;
  confirmRemove = false;

  // Üres nap: új vagy másolt edzés
  emptyMode: 'new' | 'copy' = 'new';
  myWorkouts: CoachWorkoutSummary[] = [];
  copySourceId: number | null = null;
  workoutName = '';
  exerciseSearch = '';
  exerciseResults: CoachExerciseSearchItem[] = [];
  pendingExercises: CoachExerciseSearchItem[] = [];
  private readonly search$ = new Subject<string>();

  // Kiosztás
  clients: CoachClientOverview[] = [];
  assignedIds = new Set<number>();
  toAssign = new Set<number>();

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => (term.trim().length < 2 ? of([]) : this.workspace.searchExercises(term.trim()))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (results) => (this.exerciseResults = results),
        error: () => (this.exerciseResults = []),
      });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const raw = params.get('id');
      if (raw === null || raw === 'new') {
        this.programId = null;
        this.program = null;
        this.buildCells();
        return;
      }
      const id = Number(raw);
      if (!Number.isInteger(id) || id <= 0) {
        void this.router.navigate(['/coach/programs']);
        return;
      }
      this.programId = id;
      this.loadProgram(null);
      this.loadAssignment();
    });
  }

  // ----------------------------------------------------------
  // Betöltés
  // ----------------------------------------------------------

  private loadProgram(selectDay: number | null): void {
    if (this.programId === null) return;
    this.loading = true;
    forkJoin({
      program: this.workspace.getProgram(this.programId),
      links: this.workspace.getProgramDays(this.programId),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ program, links }) => {
          this.program = program;
          this.form = {
            programName: program.programName ?? '',
            programDescription: program.programDescription ?? '',
            durationDays: program.durationDays ?? 28,
            difficultyLevel: program.difficultyLevel ?? 'BEGINNER',
            startDate: program.startDate ?? toIsoDate(new Date()),
          };
          this.buildCells(links);
          const firstWorkoutDay = this.cells.find((cell) => cell.workout)?.day ?? 1;
          this.selectDay(selectDay ?? (this.cells.some((c) => c.day === this.selectedDay) ? this.selectedDay : firstWorkoutDay));
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          this.showError(error, 'coachWorkspace.loadError');
        },
      });
  }

  private buildCells(links: CoachProgramDayLink[] = []): void {
    const workoutsByLinkId = new Map<number, CoachProgramWorkout>();
    for (const workout of this.program?.workouts ?? []) {
      workoutsByLinkId.set(workout.programWorkoutId, workout);
    }
    const byDay = new Map<number, CoachProgramDayLink>();
    for (const link of links) byDay.set(link.dayIndex, link);

    const duration = Math.max(1, Number(this.form.durationDays) || 1);
    const start = this.form.startDate ? fromIsoDate(this.form.startDate) : null;
    this.cells = Array.from({ length: duration }, (_, index) => {
      const day = index + 1;
      const link = byDay.get(day) ?? null;
      const workout = link ? workoutsByLinkId.get(link.id) ?? null : null;
      return {
        day,
        date: start ? addDays(start, index) : null,
        workout,
        link,
        label: workout?.name ?? '',
      };
    });
    // A rács hétfővel kezdődik: a kezdőnap előtti üres helyek.
    const offset = start ? (start.getDay() + 6) % 7 : 0;
    this.leadingBlanks = Array.from({ length: offset }, (_, i) => i);
  }

  private loadAssignment(): void {
    if (this.programId === null) return;
    const today = toIsoDate(new Date());
    forkJoin({
      overview: this.workspace.getOverview(today, today),
      assigned: this.workspace.getAssignedUserIds(this.programId),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ overview, assigned }) => {
          this.clients = overview.clients;
          this.assignedIds = new Set(assigned);
          this.toAssign = new Set();
        },
        error: () => {
          this.clients = [];
        },
      });
  }

  // ----------------------------------------------------------
  // Program adatai
  // ----------------------------------------------------------

  saveDetails(): void {
    if (this.savingDetails) return;
    const name = this.form.programName.trim();
    const duration = Number(this.form.durationDays);
    if (!name || !Number.isInteger(duration) || duration < 1 || duration > 365 || !this.form.startDate) {
      this.showMessage('coachWorkspace.editor.detailsInvalid', 'error');
      return;
    }
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
            this.savingDetails = false;
            this.showMessage('coachWorkspace.editor.created', 'success');
            void this.router.navigate(['/coach/programs', id], { replaceUrl: true });
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
          this.loadProgram(this.selectedDay);
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
    this.selectedDay = day;
    this.confirmRemove = false;
    this.moveTarget = day;
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
      this.exerciseSearch = '';
      this.exerciseResults = [];
      this.copySourceId = null;
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
    if (!workout || this.busy) return;
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
    this.run(
      concat(
        ...changed.map((row) =>
          this.workspace.updatePrescription(workout.workoutId, row.id, {
            sets: Number(row.sets),
            repetitions: Number(row.repetitions),
            restSeconds: Number(row.restSeconds),
          }),
        ),
      ).pipe(toArray()),
      'coachWorkspace.editor.prescriptionSaved',
      this.selectedDay,
    );
  }

  moveWorkout(): void {
    const link = this.selectedCell?.link;
    const target = Number(this.moveTarget);
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

  onSearchChange(term: string): void {
    this.exerciseSearch = term;
    this.search$.next(term);
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
    if (source && !this.workoutName.trim()) this.workoutName = source.name;
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

  get assignedClients(): CoachClientOverview[] {
    return this.clients.filter((client) => this.assignedIds.has(client.userId));
  }

  get unassignedClients(): CoachClientOverview[] {
    return this.clients.filter((client) => !this.assignedIds.has(client.userId));
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

  private run(operation: Observable<unknown>, successKey: string, selectDay: number): void {
    this.busy = true;
    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => undefined,
      error: (error) => {
        this.busy = false;
        this.showError(error, 'coachWorkspace.editor.actionError');
        this.loadProgram(this.selectedDay);
      },
      complete: () => {
        this.busy = false;
        this.showMessage(successKey, 'success');
        this.loadProgram(selectDay);
      },
    });
  }

  private showMessage(key: string, type: 'success' | 'error' | 'info'): void {
    this.message = key;
    this.messageType = type;
  }

  private showError(error: unknown, fallbackKey: string): void {
    this.showMessage(errorText(error, fallbackKey), 'error');
  }
}
