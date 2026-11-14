import { catchError, concatMap, finalize, map, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { ProgramEditorState } from './program-editor-state';
import type { ProgramEditorEffects } from './program-editor-effects';
import type { CoachProgramDetailsInput } from '../../../models/coach-workspace.model';

/** Program metadata saves, including immediate assignment for a new client program. */
export class ProgramDetailsEditor {
  constructor(
    private readonly state: ProgramEditorState,
    private readonly workspace: CoachWorkspaceService,
    private readonly effects: ProgramEditorEffects,
    private readonly hasDayDraft: () => boolean,
    private readonly newForUserName: () => string,
    private readonly markSaved: (details: CoachProgramDetailsInput, language: string, submittedForm: CoachProgramDetailsInput) => void,
    private readonly navigateToCreatedProgram: (id: number) => void,
  ) {}

  saveDetails(): void {
    if (this.state.operationPending ||
        (this.state.programId !== null && (this.state.program?.programId !== this.state.programId || this.state.detailsLanguage !== this.state.languageCode))) return;
    const name = this.state.form.programName.trim();
    const duration = Number(this.state.form.durationDays);
    if (!name || !Number.isInteger(duration) || duration < 1 || duration > 365 || !this.state.form.startDate) {
      this.effects.showMessage('coachWorkspace.editor.detailsInvalid', 'error');
      return;
    }
    if (duration < this.state.selectedDay && this.hasDayDraft()) {
      this.effects.showMessage('coachWorkspace.editor.saveBeforeShortening', 'error');
      return;
    }
    const language = this.state.languageCode;
    const submittedForm = { ...this.state.form };
    const details: CoachProgramDetailsInput = {
      programName: name,
      programDescription: this.state.form.programDescription?.trim() ?? '',
      durationDays: duration,
      difficultyLevel: this.state.form.difficultyLevel,
      startDate: this.state.form.startDate,
    };
    this.state.savingDetails = true;

    if (this.state.programId === null) {
      const userId = this.state.newForUserId;
      const userName = this.newForUserName();
      this.workspace.createProgram(details, language).pipe(
        concatMap(id => userId === null
          ? of({ id, assignment: 'notRequested' as const })
          : this.workspace.assignProgram(userId, id).pipe(
              map(() => ({ id, assignment: 'assigned' as const })),
              catchError(() => of({ id, assignment: 'failed' as const })),
            )),
        takeUntilDestroyed(this.effects.destroyRef),
        finalize(() => { this.state.savingDetails = false; }),
      ).subscribe({
        next: result => {
          this.state.savingDetails = false;
          this.markSaved(details, language, submittedForm);
          if (result.assignment === 'failed') this.effects.showMessage('coachWorkspace.editor.partialAssignment', 'error');
          else if (result.assignment === 'assigned') this.effects.showMessage('coachWorkspace.editor.createdForClient', 'success', { name: userName });
          else this.effects.showMessage('coachWorkspace.editor.created', 'success');
          this.navigateToCreatedProgram(result.id);
        },
        error: error => { this.effects.showError(error, 'coachWorkspace.editor.saveError'); },
      });
      return;
    }

    this.workspace
      .updateProgram(this.state.programId, details, language)
      .pipe(takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({
        next: () => {
          this.state.savingDetails = false;
          this.markSaved(details, language, submittedForm);
          this.effects.showMessage('coachWorkspace.editor.saved', 'success');
          this.effects.reload(this.state.selectedDay, true, submittedForm, language);
        },
        error: (error) => {
          this.state.savingDetails = false;
          this.effects.showError(error, 'coachWorkspace.editor.saveError');
        },
      });
  }
}
