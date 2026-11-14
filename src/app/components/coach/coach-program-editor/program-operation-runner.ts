import type { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, tap, type Observable } from 'rxjs';
import type { ProgramEditorState } from './program-editor-state';

export interface ProgramOperationOutcomes {
  success(): void;
  failure(error: unknown): void;
}

/** Owns request exclusion and lifetime; callers own success and recovery policies. */
export class ProgramOperationRunner {
  constructor(private readonly state: ProgramEditorState, private readonly destroyRef: DestroyRef) {}

  run(operation: Observable<unknown>, outcomes: ProgramOperationOutcomes): void {
    if (this.state.operationPending) return;
    this.state.busy = true;
    let released = false;
    const release = () => { if (!released) { released = true; this.state.busy = false; } };
    operation.pipe(
      tap({ complete: () => { release(); outcomes.success(); } }),
      takeUntilDestroyed(this.destroyRef), finalize(release))
      .subscribe({
        error: error => { release(); outcomes.failure(error); },
      });
  }
}
