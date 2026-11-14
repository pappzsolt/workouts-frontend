import { ProgramOperationRunner } from './program-operation-runner';
import { LanguageService } from '../../../services/shared/language.service';
import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, distinctUntilChanged, forkJoin, takeUntil } from 'rxjs';
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
import { ProgramEditorState, programDetails } from './program-editor-state';
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
  private readonly language = inject(LanguageService);

  private readonly workspace = inject(CoachWorkspaceService);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);

  private readonly programLoadCancelled$ = new Subject<void>();

  readonly weekdayKeys = WEEKDAY_KEYS;

  readonly difficultyOptions = DIFFICULTY_OPTIONS;

  readonly state = Object.assign(new ProgramEditorState(), { languageCode: this.language.getCurrentLanguage() });
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

  private readonly detailsDrafts = new Map<string, Partial<CoachProgramDetailsInput>>();
  private detailsBaseline: CoachProgramDetailsInput = { ...this.state.form };
  private leaveResult?: Subject<boolean>;
  leaveConfirmationOpen = false;
  private allowNavigationAfterCreate = false;

  private readonly operations = new ProgramOperationRunner(this.state, this.destroyRef);

  private readonly effects: ProgramEditorEffects = {
    destroyRef: this.destroyRef,
    showMessage: (key, type, params) => this.showMessage(key, type, params),
    showError: (error, fallbackKey) => this.showError(error, fallbackKey),
    reload: (day, preserveDrafts, submittedForm, submittedLanguage) => this.loadProgram(day, preserveDrafts, submittedForm, submittedLanguage),
    run: (operation, outcomes) => this.operations.run(operation, outcomes),
  };

  readonly workouts = new ProgramDayWorkoutEditor(this.state, this.workspace, this.effects, this.router);
  readonly library = new ProgramWorkoutLibrary(this.state, this.workspace, this.effects);
  readonly assignments = new ProgramClientAssignments(this.state, this.workspace, this.effects);
  readonly details = new ProgramDetailsEditor(
    this.state, this.workspace, this.effects,
    () => this.hasDayDraft(), () => this.assignments.newForUserName,
    (details, language, submittedForm) => this.markDetailsSaved(details, language, submittedForm), (id) => this.navigateToCreatedProgram(id),
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
        this.state.detailsLanguage = null;
        this.detailsDrafts.clear();
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
        this.state.detailsLanguage = null;
        this.detailsDrafts.clear();
        this.state.cells = [];
        this.assignments.reset();
        this.activeTab = 'workouts';
        this.editDetails = false;
      }
      this.state.programId = id;
      this.loadProgram(null);
    });
    this.language.language$.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(language => {
      if (language === this.state.languageCode) return;
      this.state.languageCode = language;
      if (this.state.programId !== null) this.loadProgram(this.state.selectedDay, true);
    });
  }

  private loadProgram(
    selectDay: number | null,
    preserveDrafts = false,
    submittedForm?: CoachProgramDetailsInput,
    submittedLanguage?: string,
  ): void {
    if (this.state.programId === null) return;
    this.programLoadCancelled$.next();
    this.assignments.cancelLoad();
    const programId = this.state.programId;
    const language = this.state.languageCode;
    this.state.loading = true;
    forkJoin({
      program: this.workspace.getProgram(programId, language),
      links: this.workspace.getProgramDays(programId),
    })
      .pipe(takeUntil(this.programLoadCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ program, links }) => {
          if (this.state.programId !== programId || this.state.languageCode !== language) return;
          // Read drafts when the response arrives, including edits made while loading.
          const emptyDraft = preserveDrafts ? this.library.captureDraft() : null;
          // A daily action can reload the program while its metadata is still being edited.
          // Only keep fields changed since the last successful baseline (or since a
          // submitted save), never carry another program's draft into this program.
          const metadataDraft: Partial<CoachProgramDetailsInput> = {};
          if (this.state.program?.programId === programId) {
            const baseline = submittedForm && submittedLanguage === this.state.detailsLanguage ? submittedForm : this.detailsBaseline;
            // Text belongs to its loaded language; dates, duration and difficulty are shared.
            const localizedDraft: Partial<CoachProgramDetailsInput> = {};
            for (const key of Object.keys(baseline) as (keyof CoachProgramDetailsInput)[]) {
              if (String(this.state.form[key] ?? '') !== String(baseline[key] ?? '')) {
                Object.assign(key === 'programName' || key === 'programDescription' ? localizedDraft : metadataDraft, { [key]: this.state.form[key] });
              }
            }
            if (this.state.detailsLanguage !== null) this.detailsDrafts.set(this.state.detailsLanguage, localizedDraft);
          }
          this.state.program = program;
          this.detailsBaseline = programDetails(program);
          this.state.form = { ...this.detailsBaseline, ...metadataDraft, ...this.detailsDrafts.get(language) };
          this.state.detailsLanguage = language;
          this.buildCells(links);
          this.assignments.loadAssignment();
          const firstWorkoutDay = this.state.cells.find((cell) => cell.workout)?.day ?? 1;
          this.openDay(selectDay ?? (this.state.cells.some((c) => c.day === this.state.selectedDay) ? this.state.selectedDay : firstWorkoutDay));
          if (emptyDraft && this.state.selectedCell && !this.state.selectedCell.workout) this.library.restoreDraft(emptyDraft);
          this.state.loading = false;
        },
        error: (error) => {
          if (this.state.programId !== programId || this.state.languageCode !== language) return;
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

  private showMessage(key: string, type: 'success' | 'error' | 'info', params: Record<string, unknown> = {}): void {
    this.state.message = key;
    this.state.messageType = type;
    this.state.messageParams = params;
  }

  private showError(error: unknown, fallbackKey: string): void {
    this.showMessage(errorText(error, fallbackKey), 'error');
  }

  /** Baseline used only for navigation protection; never changes request payloads. */
  markDetailsSaved(details: CoachProgramDetailsInput, language = this.state.detailsLanguage, submittedForm = details): void {
    if (language === this.state.detailsLanguage) this.detailsBaseline = { ...details };
    if (language === null) return;
    // A save may complete while another language is displayed. Keep only newer edits.
    const draft = this.detailsDrafts.get(language);
    if (!draft) return;
    for (const key of ['programName', 'programDescription'] as const) {
      if (draft[key] === submittedForm[key] || draft[key] === details[key]) delete draft[key];
    }
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
      .some((key) => String(this.state.form[key] ?? '') !== String(this.detailsBaseline[key] ?? ''))
      || [...this.detailsDrafts].some(([language, draft]) => language !== this.state.detailsLanguage && Object.keys(draft).length > 0);
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
    return this.library.hasDraft;
  }

  private openDay(day: number): void {
    this.state.pendingDay = null;
    this.state.selectedDay = day;
    this.workouts.openDay(day);
    this.library.openDay();
  }

}
