import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { SHARED_IMPORTS } from '../../shared-imports';
import { ExercisePickerComponent } from '../../../coach/exercise-picker/exercise-picker.component';
import { CoachWorkspaceService } from '../../../../services/coach/coach-workspace.service';
import { toIsoDate } from '../../../../shared/local-date';
import { LanguageService } from '../../../../services/shared/language.service';
import { ProgramImportService, ImportIssue, ImportRequest, ImportResult, ImportScope } from '../../../../services/shared/program-import.service';
import { CoachExerciseSearchItem } from '../../../../models/coach-workspace.model';
import { errorMessage } from '../../../../models/backend-dto/common/api-response-message';

@Component({
  selector: 'app-program-import',
  standalone: true,
  imports: [...SHARED_IMPORTS, ExercisePickerComponent],
  templateUrl: './program-import.component.html',
})
export class ProgramImportComponent implements OnInit {
  private readonly service = inject(ProgramImportService);
  private readonly workspace = inject(CoachWorkspaceService);
  private readonly language = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly scope: ImportScope = this.route.snapshot.data['importScope'] === 'personal' ? 'personal' : 'coach';
  clients: { userId: number; username: string }[] = [];
  loadingClients = false;
  clientError = '';
  userId: number | null = null;
  file: File | null = null;
  programName = '';
  startDate = '';
  programLanguage = this.language.getCurrentLanguage();
  message = '';
  uncertain = false;
  busy: 'preview' | 'import' | null = null;
  preview: ImportResult | null = null;
  result: ImportResult | null = null;
  issues: ImportIssue[] = [];
  mappings: Record<string, { id: number; name: string }> = {};
  activeMapping: string | null = null;
  private checkedRequest: ImportRequest | null = null;

  get backLink(): string { return this.scope === 'coach' ? '/coach/programs' : '/user/personal-programs'; }
  get selectedClient(): string { return this.clients.find(c => c.userId === this.userId)?.username ?? ''; }
  get canPreview(): boolean {
    return !!this.file && !this.busy && !this.result && (this.scope === 'personal' || this.clients.some(c => c.userId === this.userId));
  }
  get canImport(): boolean { return !!this.preview && this.preview.unresolvedExercises.length === 0 && !!this.checkedRequest && !this.busy && !this.result; }

  ngOnInit(): void {
    if (this.scope === 'coach') this.loadClients();
  }
  canLeave(): boolean { return this.busy !== 'import'; }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (!this.canLeave()) { event.preventDefault(); event.returnValue = ''; }
  }
  loadClients(): void {
    if (this.loadingClients) return;
    this.loadingClients = true;
    this.clientError = '';
    const today = toIsoDate(new Date());
    this.workspace.getOverview(today, today).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: overview => {
        this.clients = overview.clients.map(c => ({ userId: c.userId, username: c.username }));
        const requested = Number(this.route.snapshot.queryParamMap.get('userId'));
        if (this.clients.some(c => c.userId === requested)) this.userId = requested;
        this.loadingClients = false;
      },
      error: error => { this.clientError = errorMessage(error, 'excelImport.clientsFailed'); this.loadingClients = false; },
    });
  }
  changed(): void {
    this.preview = null;
    this.checkedRequest = null;
    this.message = '';
  }
  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.changed(); this.issues = []; this.mappings = {}; this.activeMapping = null; this.file = null;
    const file = input.files?.[0];
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name) || !file.size || file.size > 5 * 1024 * 1024) {
      this.message = 'excelImport.invalidFile'; input.value = ''; return;
    }
    this.file = file;
  }
  pickExercise(exercise: CoachExerciseSearchItem): void {
    if (this.busy || !this.activeMapping) return;
    this.mappings = { ...this.mappings, [this.activeMapping]: { id: exercise.id, name: exercise.name } };
    this.activeMapping = null;
    this.changed();
  }
  clearMapping(name: string): void {
    if (this.busy) return;
    const copy = { ...this.mappings }; delete copy[name]; this.mappings = copy; this.changed();
  }
  check(): void {
    if (!this.canPreview || !this.file) return;
    const request: ImportRequest = {
      file: this.file, userId: this.scope === 'coach' ? this.userId : null,
      programName: this.programName.trim(), startDate: this.startDate, language: this.programLanguage,
      exerciseMappings: Object.fromEntries(Object.entries(this.mappings).map(([name, e]) => [name, e.id])),
    };
    this.changed(); this.busy = 'preview'; this.activeMapping = null;
    this.service.preview(this.scope, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => {
        this.preview = result; this.checkedRequest = request;
        // Keep resolved rows visible so the user can review or change their choices.
        const resolved = this.issues.filter(issue => !!this.mappings[issue.name]);
        this.issues = [...resolved, ...result.unresolvedExercises.filter(issue => !resolved.some(r => r.name === issue.name))];
        this.busy = null;
      },
      error: error => { this.message = errorMessage(error, 'excelImport.failed'); this.busy = null; },
    });
  }
  save(): void {
    if (!this.canImport || !this.checkedRequest) return;
    this.busy = 'import'; this.message = ''; this.uncertain = false;
    this.service.import(this.scope, this.checkedRequest).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => { this.result = result; this.busy = null; this.preview = null; this.checkedRequest = null; },
      error: error => {
        this.message = errorMessage(error, 'excelImport.failed');
        this.uncertain = error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500);
        this.preview = null; this.checkedRequest = null; this.busy = null;
      },
    });
  }
  reset(): void {
    if (this.busy) return;
    this.file = null; this.programName = ''; this.startDate = ''; this.result = null;
    this.issues = []; this.mappings = {}; this.activeMapping = null; this.uncertain = false; this.changed();
  }
}
