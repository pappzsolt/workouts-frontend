import type { DestroyRef } from '@angular/core';
import type { Observable } from 'rxjs';
import type { CoachProgramDetailsInput } from '../../../models/coach-workspace.model';

/** Screen notifications, request lifetime and reload coordination. */
export interface ProgramEditorEffects {
  readonly destroyRef: DestroyRef;
  showMessage(key: string, type: 'success' | 'error' | 'info', params?: Record<string, unknown>): void;
  showError(error: unknown, fallbackKey: string): void;
  reload(selectDay: number | null, preserveDrafts?: boolean, submittedForm?: CoachProgramDetailsInput): void;
  run(operation: Observable<unknown>, successKey: string, selectDay: number, preserveDrafts?: boolean): void;
}
