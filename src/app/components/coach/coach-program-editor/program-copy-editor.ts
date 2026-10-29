import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { ProgramEditorState } from './program-editor-state';
import type { ProgramEditorEffects } from './program-editor-effects';
import type { Router } from '@angular/router';
import { toIsoDate } from '../../../shared/local-date';

/** Program copy dialog and its save operation. */
export class ProgramCopyEditor {
  copyOpen = false;
  copyName = '';
  copyStart = '';
  copyUserId: number | null = null;
  constructor(
    private readonly state: ProgramEditorState,
    private readonly workspace: CoachWorkspaceService,
    private readonly effects: ProgramEditorEffects,
    private readonly router: Router,
  ) {}

  openCopy(): void {
    this.copyOpen = true;
    this.copyName = `${this.state.form.programName} (2)`;
    this.copyStart = toIsoDate(new Date());
    this.copyUserId = null;
  }

  confirmCopy(): void {
    if (this.state.programId === null || this.state.busy) return;
    if (!this.copyName.trim() || !this.copyStart) {
      this.effects.showMessage('coachWorkspace.editor.copyProgramInvalid', 'error');
      return;
    }
    this.state.busy = true;
    this.workspace
      .copyProgram(this.state.programId, this.copyName.trim(), this.copyStart, this.copyUserId)
      .pipe(takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({
        next: (id) => {
          this.state.busy = false;
          this.copyOpen = false;
          this.effects.showMessage('coachWorkspace.editor.programCopied', 'success');
          void this.router.navigate(['/coach/programs', id]);
        },
        error: (error) => {
          this.state.busy = false;
          this.effects.showError(error, 'coachWorkspace.editor.actionError');
        },
      });
  }
}
