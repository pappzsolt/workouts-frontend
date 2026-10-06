import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription, concatMap, finalize, from, tap, toArray, map } from 'rxjs';
import { AssignProgramService } from '../assign-program/assignprogram.service';
import { responseMessage } from '../../../models/backend-dto/common/api-response-message';
import { ProgramAssignmentState } from '../../../models/program-assignment-state';

/** Component-scoped assignment workflow, including partial-success retry. */
@Injectable()
export class ProgramBuilderAssignmentStore {
  private readonly api = inject(AssignProgramService);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = new ProgramAssignmentState();
  busy = false;
  message = '';
  loaded = true;
  selectionReady = false;
  private loadRequest?: Subscription;

  load(programId: number, failed: (error: unknown) => void, loaded?: (message: string) => void): void {
    this.loadRequest?.unsubscribe();
    this.loaded = false;
    this.loadRequest = this.api.getAssignedUserIds(programId).pipe(
      tap(response => {
        if (!response.success || !Array.isArray(response.data)) throw new Error(response.message || 'coachProgramBuilder.assignError');
        this.state.loadAssigned(response.data);
        this.loaded = true;
        loaded?.(response.message || '');
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({ error: failed });
  }

  save(programId: number): Observable<void> {
    if (!this.loaded || !this.selectionReady || !this.state.selectedUserIds.length) {
      throw new Error('coachProgramBuilder.noUserSelected');
    }
    this.message = '';
    this.busy = true;
    return from(this.state.pendingUserIds).pipe(
      concatMap(userId => this.api.assignProgramToUser(userId, programId).pipe(
        tap(response => {
          if (!response.success) throw new Error(response.message || 'coachProgramBuilder.assignError');
          this.state.markAssigned(userId);
        }),
      )),
      toArray(), map(responses => {
        this.message = responseMessage(responses, 'assignProgram.success');
        return undefined;
      }),
      finalize(() => { this.busy = false; }),
      takeUntilDestroyed(this.destroyRef),
    );
  }
}
