import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, forkJoin, takeUntil } from 'rxjs';
import { AppLoadingComponent } from '../../shared/components/app-state/app-state.component';
import { CoachCalendarComponent } from '../coach-calendar/coach-calendar.component';
import { FormsModule } from '@angular/forms';
import { ProgramClientCalendarComponent } from './parts/program-client-calendar.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { MessageComponent } from '../../shared/components/message/message.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import { toIsoDate } from '../../../shared/local-date';
import type { CoachProgramDayLink, CoachProgramDetailsInput } from '../../../models/coach-workspace.model';
import { DIFFICULTY_OPTIONS, WEEKDAY_KEYS, errorText } from '../coach-ui';
import { type DayCell, buildDayCells, dayAriaLabel } from './program-days';
import { ProgramClientsPanelComponent } from './parts/program-clients-panel.component';
import { ProgramCopyDialogComponent } from './parts/program-copy-dialog.component';
import { ProgramPlannerComponent } from './parts/program-planner.component';
import { ProgramDayWorkoutComponent } from './parts/program-day-workout.component';
import { ProgramDetailsFormComponent } from './parts/program-details-form.component';
import { ProgramEmptyDayComponent } from './parts/program-empty-day.component';
import { ProgramMultiAddDialogComponent } from './parts/program-multi-add-dialog.component';
import { ProgramEditorState } from './program-editor-state';
import type { ProgramEditorEffects } from './program-editor-effects';
import { ProgramDayWorkoutEditor } from './program-day-workout-editor';
import { ProgramWorkoutLibrary } from './program-workout-library';
import { ProgramClientAssignments } from './program-client-assignments';
import { ProgramDetailsEditor } from './program-details-editor';
import { ProgramCopyEditor } from './program-copy-editor';

/**
 * Programszerkesztő egy oldalon: program adatai, napok rácsa, a kiválasztott
 * nap edzése (gyakorlatok előírt értékei), új vagy másolt edzés felvétele egy
 * üres napra, és a program kiosztása ügyfeleknek.
 */
@Component({
  selector: 'app-coach-program-editor',
  standalone: true,
  imports: [
    CoachCalendarComponent, FormsModule, ProgramClientCalendarComponent, AppLoadingComponent, CommonModule, RouterModule, TranslatePipe, ConfirmDialogComponent, MessageComponent, AppIconComponent,
    ProgramDetailsFormComponent,
    ProgramPlannerComponent, ProgramDayWorkoutComponent,
    ProgramEmptyDayComponent,
    ProgramClientsPanelComponent,
    ProgramMultiAddDialogComponent,
    ProgramCopyDialogComponent,
  ],
  templateUrl: './coach-program-editor.component.html',
})
export class CoachProgramEditorComponent implements OnInit {
  private readonly workspace = inject(CoachWorkspaceService);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);

  private readonly programLoadCancelled$ = new Subject<void>();

  readonly weekdayKeys = WEEKDAY_KEYS;

  readonly difficultyOptions = DIFFICULTY_OPTIONS;

  readonly state = new ProgramEditorState();
  activeTab: 'workouts' | 'calendar' | 'clients' = 'workouts';
  editDetails = false;
  readonly programTabs = [
    { id: 'workouts', label: 'coachWorkspace.editor.workoutsTab' },
    { id: 'calendar', label: 'coachWorkspace.editor.calendarTab' },
    { id: 'clients', label: 'coachWorkspace.editor.clientsTab' },
  ] as const;

  selectTab(tab: 'workouts' | 'calendar' | 'clients'): void {
    if (this.state.operationPending) return;
    this.activeTab = tab;
  }

  onTabKeydown(event: KeyboardEvent): void {
    const index = this.programTabs.findIndex(tab => tab.id === this.activeTab);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % this.programTabs.length;
    else if (event.key === 'ArrowLeft') next = (index + this.programTabs.length - 1) % this.programTabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = this.programTabs.length - 1;
    else return;
    event.preventDefault();
    this.selectTab(this.programTabs[next].id);
    const buttons = (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]');
    if (!buttons[next]?.disabled) buttons[next]?.focus();
  }

  private detailsBaseline: CoachProgramDetailsInput = { ...this.state.form };
  private leaveResult?: Subject<boolean>;
  leaveConfirmationOpen = false;
  private allowNavigationAfterCreate = false;

  private readonly effects: ProgramEditorEffects = {
    destroyRef: this.destroyRef,
    showMessage: (key, type, params) => this.showMessage(key, type, params),
    showError: (error, fallbackKey) => this.showError(error, fallbackKey),
    reload: (day, preserveDrafts, submittedForm) => this.loadProgram(day, preserveDrafts, submittedForm),
    run: (operation, key, day, preserveDrafts, onError) => this.run(operation, key, day, preserveDrafts, onError),
  };

  readonly workouts = new ProgramDayWorkoutEditor(this.state, this.workspace, this.effects, this.router);
  readonly library = new ProgramWorkoutLibrary(this.state, this.workspace, this.effects);
  readonly assignments = new ProgramClientAssignments(this.state, this.workspace, this.effects);
  readonly details = new ProgramDetailsEditor(
    this.state, this.workspace, this.effects,
    () => this.hasDayDraft(), () => this.assignments.newForUserName,
    (details) => this.markDetailsSaved(details), (id) => this.navigateToCreatedProgram(id),
  );
  readonly copy = new ProgramCopyEditor(this.state, this.workspace, this.effects, this.router);

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.resolveLeave(false));
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.programLoadCancelled$.next();
      this.assignments.cancelLoad();
      this.state.loading = false;
      this.state.pendingDay = null;
      const raw = params.get('id');
      if (raw === null || raw === 'new') {
        this.state.programId = null;
        this.state.program = null;
        this.workouts.rows = [];
        this.assignments.reset();
        this.activeTab = 'workouts';
        this.editDetails = false;
        this.state.form = {
          programName: '', programDescription: '', durationDays: 28,
          difficultyLevel: 'BEGINNER', startDate: toIsoDate(new Date()),
        };
        const forUser = Number(this.route.snapshot.queryParamMap.get('userId'));
        this.state.newForUserId = Number.isInteger(forUser) && forUser > 0 ? forUser : null;
        if (this.state.newForUserId !== null) this.assignments.loadClientsOnly();
        this.detailsBaseline = { ...this.state.form };
        this.buildCells();
        return;
      }
      const id = Number(raw);
      if (!Number.isInteger(id) || id <= 0) {
        void this.router.navigate(['/coach/programs']);
        return;
      }
      if (this.state.programId !== id) {
        this.state.program = null;
        this.state.cells = [];
        this.workouts.rows = [];
        this.assignments.reset();
        this.activeTab = 'workouts';
        this.editDetails = false;
      }
      this.state.programId = id;
      this.loadProgram(null);
    });
  }

  private loadProgram(
    selectDay: number | null,
    preserveDrafts = false,
    submittedForm?: CoachProgramDetailsInput,
  ): void {
    if (this.state.programId === null) return;
    this.programLoadCancelled$.next();
    this.assignments.cancelLoad();
    const programId = this.state.programId;
    this.state.loading = true;
    forkJoin({
      program: this.workspace.getProgram(programId),
      links: this.workspace.getProgramDays(programId),
    })
      .pipe(takeUntil(this.programLoadCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ program, links }) => {
          if (this.state.programId !== programId) return;
          // Read drafts when the response arrives, including edits made while loading.
          const draftWorkoutId = preserveDrafts ? this.state.selectedCell?.workout?.workoutId : undefined;
          const draftRows = preserveDrafts ? this.workouts.rows.filter((row) => this.workouts.isChanged(row)) : [];
          const emptyDraft = preserveDrafts && this.state.selectedCell && !this.state.selectedCell.workout
            ? { workoutName: this.library.workoutName, pendingExercises: [...this.library.pendingExercises],
                copySourceId: this.library.copySourceId, emptyMode: this.library.emptyMode, libraryFilter: this.library.libraryFilter }
            : null;
          // A daily action can reload the program while its metadata is still being edited.
          // Only keep fields changed since the last successful baseline (or since a
          // submitted save), never carry another program's draft into this program.
          const metadataDraft: Partial<CoachProgramDetailsInput> = {};
          if (this.state.program?.programId === programId) {
            const baseline = submittedForm ?? this.detailsBaseline;
            for (const key of Object.keys(baseline) as (keyof CoachProgramDetailsInput)[]) {
              if (this.state.form[key] !== baseline[key]) {
                Object.assign(metadataDraft, { [key]: this.state.form[key] });
              }
            }
          }
          this.state.program = program;
          this.detailsBaseline = {
            programName: program.programName ?? '',
            programDescription: program.programDescription ?? '',
            durationDays: program.durationDays ?? 28,
            difficultyLevel: program.difficultyLevel ?? 'BEGINNER',
            startDate: program.startDate ?? toIsoDate(new Date()),
          };
          this.state.form = {
            programName: program.programName ?? '',
            programDescription: program.programDescription ?? '',
            durationDays: program.durationDays ?? 28,
            difficultyLevel: program.difficultyLevel ?? 'BEGINNER',
            startDate: program.startDate ?? toIsoDate(new Date()),
            ...metadataDraft,
          };
          this.buildCells(links);
          this.assignments.loadAssignment();
          const firstWorkoutDay = this.state.cells.find((cell) => cell.workout)?.day ?? 1;
          this.openDay(selectDay ?? (this.state.cells.some((c) => c.day === this.state.selectedDay) ? this.state.selectedDay : firstWorkoutDay));
          if (draftWorkoutId !== undefined && this.state.selectedCell?.workout?.workoutId === draftWorkoutId) {
            for (const row of this.workouts.rows) {
              const draft = draftRows.find((item) => item.id === row.id);
              if (draft) {
                for (const key of ['sets', 'repetitions', 'restSeconds'] as const) {
                  if (Number(draft[key]) !== Number(draft.original[key])) row[key] = draft[key];
                }
              }
            }
          } else if (emptyDraft && this.state.selectedCell && !this.state.selectedCell.workout) {
            Object.assign(this.library, emptyDraft);
          }
          this.state.loading = false;
        },
        error: (error) => {
          if (this.state.programId !== programId) return;
          this.state.loading = false;
          this.showError(error, 'coachWorkspace.loadError');
        },
      });
  }

  private buildCells(links: CoachProgramDayLink[] = []): void {
    const { cells, leadingBlanks } = buildDayCells(this.state.program, links, this.state.program?.durationDays ?? this.state.form.durationDays, this.state.program?.startDate ?? this.state.form.startDate);
    this.state.cells = cells;
    this.state.leadingBlanks = leadingBlanks;
  }

  selectDay(day: number): void {
    if (day === this.state.selectedDay || this.state.operationPending || !this.state.cells.some((cell) => cell.day === day)) return;
    if (this.hasDayDraft()) {
      this.state.pendingDay = day;
      return;
    }
    this.openDay(day);
  }

  cancelDayChange(): void {
    this.state.pendingDay = null;
  }

  discardAndChangeDay(): void {
    if (this.state.pendingDay === null || this.state.operationPending) return;
    this.openDay(this.state.pendingDay);
  }

  dayAriaLabel(cell: DayCell): string {
    return dayAriaLabel(cell);
  }

  private run(operation: Observable<unknown>, successKey: string, selectDay: number,
              preserveDrafts = false, onError?: (error: unknown) => boolean): void {
    if (this.state.operationPending) return;
    this.state.busy = true;
    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => undefined,
      error: (error) => {
        this.state.busy = false;
        if (!onError?.(error)) this.showError(error, 'coachWorkspace.editor.actionError');
        this.loadProgram(this.state.selectedDay, preserveDrafts);
      },
      complete: () => {
        this.state.busy = false;
        this.library.myWorkouts = [];
        this.showMessage(successKey, 'success');
        this.loadProgram(selectDay, preserveDrafts);
      },
    });
  }

  private showMessage(key: string, type: 'success' | 'error' | 'info', params: Record<string, unknown> = {}): void {
    this.state.message = key;
    this.state.messageType = type;
    this.state.messageParams = params;
  }

  private showError(error: unknown, fallbackKey: string): void {
    this.showMessage(errorText(error, fallbackKey), 'error');
  }

  /** Baseline used only for navigation protection; never changes request payloads. */
  markDetailsSaved(details: CoachProgramDetailsInput): void {
    this.detailsBaseline = { ...details };
  }

  /** Newly created programs navigate to their editor without an unnecessary warning. */
  navigateToCreatedProgram(id: number): void {
    this.allowNavigationAfterCreate = true;
    void this.router.navigate(['/coach/programs', id], { replaceUrl: true })
      .then(() => { this.allowNavigationAfterCreate = false; })
      .catch(() => { this.allowNavigationAfterCreate = false; });
  }

  private hasUnsavedDetails(): boolean {
    return (Object.keys(this.detailsBaseline) as (keyof CoachProgramDetailsInput)[])
      .some((key) => String(this.state.form[key] ?? '') !== String(this.detailsBaseline[key] ?? ''));
  }

  get hasUnsavedChanges(): boolean {
    return this.hasUnsavedDetails() || this.hasDayDraft() || this.assignments.toAssign.size > 0;
  }

  canLeave(): boolean | Observable<boolean> {
    if (this.allowNavigationAfterCreate) return true;
    if (this.state.busy || this.state.savingDetails || this.state.savingClientWorkout) return false;
    if (!this.hasUnsavedChanges) return true;
    this.leaveConfirmationOpen = true;
    this.leaveResult ??= new Subject<boolean>();
    return this.leaveResult.asObservable();
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges || this.state.busy || this.state.savingDetails || this.state.savingClientWorkout) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  confirmLeave(): void { this.resolveLeave(true); }
  cancelLeave(): void { this.resolveLeave(false); }

  private resolveLeave(leave: boolean): void {
    this.leaveConfirmationOpen = false;
    this.leaveResult?.next(leave);
    this.leaveResult?.complete();
    this.leaveResult = undefined;
  }

  private hasDayDraft(): boolean {
    return this.workouts.changedCount > 0 || this.library.hasDraft;
  }

  private openDay(day: number): void {
    this.state.pendingDay = null;
    this.state.selectedDay = day;
    this.workouts.openDay(day);
    this.library.openDay();
  }

}
