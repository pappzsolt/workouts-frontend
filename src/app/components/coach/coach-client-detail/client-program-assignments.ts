import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { takeUntil } from 'rxjs';
import type { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { CoachClientOverview, CoachProgram } from '../../../models/coach-workspace.model';
import type { ClientDetailEffects } from './client-detail-effects';

/** Owns program assignment/revocation requests and their confirmation dialogs. */
export class ClientProgramAssignments {
  assignOpen = false;
  assignLoading = false;
  assignablePrograms: CoachProgram[] = [];
  assignProgramId: number | null = null;
  assigning = false;
  revokeProgramId: number | null = null;

  constructor(
    private readonly workspace: Pick<CoachWorkspaceService, 'getCoachPrograms' | 'assignProgram' | 'revokeProgram'>,
    private readonly effects: ClientDetailEffects,
    private readonly onAssigned: (programId: number) => void,
    private readonly onRevoked: (programId: number) => void,
  ) {}

  reset(): void {
    this.assignOpen = false;
    this.assignLoading = false;
    this.assignablePrograms = [];
    this.assignProgramId = null;
    this.assigning = false;
    this.revokeProgramId = null;
  }

  openAssign(client: CoachClientOverview | null): void {
    this.assignOpen = true;
    this.assignLoading = true;
    this.assignProgramId = null;
    const assigned = new Set((client?.programs ?? []).map((program) => program.programId));
    this.workspace
      .getCoachPrograms()
      .pipe(takeUntil(this.effects.cancelled$), takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({
        next: (programs) => {
          this.assignablePrograms = programs
            .filter((program) => !assigned.has(program.programId))
            .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
          this.assignProgramId = this.assignablePrograms[0]?.programId ?? null;
          this.assignLoading = false;
        },
        error: (error) => {
          this.assignLoading = false;
          this.assignOpen = false;
          this.effects.showError(error, 'coachWorkspace.loadError');
        },
      });
  }

  closeAssign(): void {
    if (!this.assigning) this.assignOpen = false;
  }

  confirmAssign(userId: number): void {
    if (this.assignProgramId === null || this.assigning) return;
    this.assigning = true;
    const programId = this.assignProgramId;
    const program = this.assignablePrograms.find((p) => p.programId === programId);
    this.workspace
      .assignProgram(userId, programId)
      .pipe(takeUntil(this.effects.cancelled$), takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({
        next: () => {
          this.assigning = false;
          this.assignOpen = false;
          this.effects.showMessage('coachWorkspace.client.assignedNamed', 'success', { program: program?.programName ?? '' });
          this.onAssigned(programId);
        },
        error: (error) => {
          this.assigning = false;
          this.effects.showError(error, 'coachWorkspace.client.assignError');
        },
      });
  }

  askRevoke(programId: number): void {
    this.revokeProgramId = programId;
  }

  cancelRevoke(): void {
    this.revokeProgramId = null;
  }

  confirmRevoke(userId: number): void {
    if (this.revokeProgramId === null) return;
    const programId = this.revokeProgramId;
    this.workspace
      .revokeProgram(programId, userId)
      .pipe(takeUntil(this.effects.cancelled$), takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({
        next: () => {
          this.revokeProgramId = null;
          this.effects.showMessage('coachWorkspace.client.revoked', 'success');
          this.onRevoked(programId);
        },
        error: (error) => {
          this.revokeProgramId = null;
          this.effects.showError(error, 'coachWorkspace.client.revokeError');
        },
      });
  }
}
