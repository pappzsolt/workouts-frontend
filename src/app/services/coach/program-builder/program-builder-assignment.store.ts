import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription, concatMap, finalize, from, tap, toArray, map } from 'rxjs';
import { AssignProgramService } from '../assign-program/assignprogram.service';
import { ProgramAssignmentState } from '../../../models/program-assignment-state';

/** Component-scoped assignment workflow, including partial-success retry. */
@Injectable()
export class ProgramBuilderAssignmentStore {
  private readonly api = inject(AssignProgramService);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = new ProgramAssignmentState();
  busy = false;
  loaded = true;
  selectionReady = false;
  private loadRequest?: Subscription;

  load(programId: number, failed: (error: unknown) => void): void {
    this.loadRequest?.unsubscribe();
    this.loaded = false;
    this.loadRequest = this.api.getAssignedUserIds(programId).pipe(
      tap(response => {
        if (!response.success || !Array.isArray(response.data)) throw new Error(response.message || 'coachProgramBuilder.assignError');
        this.state.loadAssigned(response.data);
        this.loaded = true;
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({ error: failed });
  }

  save(programId: number): Observable<void> {
    if (!this.loaded || !this.selectionReady || !this.state.selectedUserIds.length) {
      throw new Error('coachProgramBuilder.noUserSelected');
    }
    this.busy = true;
    return from(this.state.pendingUserIds).pipe(
      concatMap(userId => this.api.assignProgramToUser(userId, programId).pipe(
        tap(response => {
          if (!response.success) throw new Error(response.message || 'coachProgramBuilder.assignError');
          this.state.markAssigned(userId);
        }),
      )),
      toArray(), map(() => undefined),
      finalize(() => { this.busy = false; }),
      takeUntilDestroyed(this.destroyRef),
    );
  }
}
