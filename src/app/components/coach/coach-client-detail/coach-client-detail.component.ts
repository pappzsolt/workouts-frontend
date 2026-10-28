import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';

import { SHARED_IMPORTS } from '../../shared/shared-imports';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import { toIsoDate } from '../../../shared/local-date';
import type {
  CoachClientOverview,
  CoachClientProgram,
  CoachWorkoutStatus,
} from '../../../models/coach-workspace.model';
import { downloadBlob, errorText, initial, programExportFileName } from '../coach-ui';
import {
  type ClientWorkoutEntry,
  type WeekGroup,
  buildWeeks,
  groupWorkouts,
  programStateKey,
  sortPrograms,
  workoutStatus,
} from './client-plan';
import { ClientAssignDialogComponent } from './parts/client-assign-dialog.component';
import { ClientExerciseSetsComponent } from './parts/client-exercise-sets.component';
import { ClientProgramsTabComponent } from './parts/client-programs-tab.component';
import { ClientWorkoutListComponent } from './parts/client-workout-list.component';

import type { ClientDetailEffects } from './client-detail-effects';
import { ClientSetEditor } from './client-set-editor';
import { ClientProgramAssignments } from './client-program-assignments';
import { ClientWorkoutSchedule } from './client-workout-schedule';

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

  private readonly effects: ClientDetailEffects = {
    cancelled$: this.clientContextCancelled$,
    destroyRef: this.destroyRef,
    showMessage: (key, type, params) => this.showMessage(key, type, params),
    showError: (error, fallbackKey) => this.showError(error, fallbackKey),
  };

  readonly setEditor = new ClientSetEditor(this.workspace, this.effects, () => this.selected);
  readonly assignments = new ClientProgramAssignments(
    this.workspace,
    this.effects,
    programId => {
      this.tab = 'plan';
      this.loadClient(programId);
    },
    programId => {
      if (this.programId === programId) this.programId = null;
      this.loadClient(null);
    },
  );
  readonly schedule = new ClientWorkoutSchedule(this.workspace, this.effects, userWorkoutId => {
    this.requestedWorkoutId = userWorkoutId;
    if (this.programId !== null) this.loadProgram(this.programId);
  });

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

  pendingNav: PendingNav | null = null;

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
    this.setEditor.reset();
    this.schedule.reset();
    this.assignments.reset();
    this.pendingNav = null;
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
            this.setEditor.exerciseSets = [];
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
    if (this.setEditor.dirty) {
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
    this.setEditor.clearWorkout();
    this.schedule.reset();
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
    const unsaved = this.setEditor.dirty;
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
    if (this.setEditor.dirty) {
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
    this.pendingNav = null;
    const workout = this.selected;
    this.schedule.rescheduleDate = workout?.date ?? '';
    this.setEditor.loadWorkout(workout);
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
      this.setEditor.discardChanges();
      go();
    } else {
      this.setEditor.saveSets(go);
    }
  }

  setTab(tab: 'plan' | 'programs'): void {
    if (tab === this.tab) return;
    if (this.setEditor.dirty && tab !== 'plan') {
      this.pendingNav = { kind: 'tab', tab };
      return;
    }
    this.tab = tab;
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
