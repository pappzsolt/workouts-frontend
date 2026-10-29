import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { ProgramEditorState } from './program-editor-state';
import type { ProgramEditorEffects } from './program-editor-effects';
import { Subject, concat, forkJoin, takeUntil, toArray } from 'rxjs';
import type { CoachClientOverview } from '../../../models/coach-workspace.model';
import { toIsoDate } from '../../../shared/local-date';
import { matchesSearch } from '../../shared/components/app-search/search-match';
import { clientInitials } from './program-days';

/** Client selection, assignment and revocation for the current program. */
export class ProgramClientAssignments {
  private readonly cancelled$ = new Subject<void>();
  clients: CoachClientOverview[] = [];
  assignedIds = new Set<number>();
  toAssign = new Set<number>();
  clientFilter = '';
  pendingRevokeClient: CoachClientOverview | null = null;
  constructor(
    private readonly state: ProgramEditorState,
    private readonly workspace: CoachWorkspaceService,
    private readonly effects: ProgramEditorEffects,
  ) {}

  cancelLoad(): void {
    this.cancelled$.next();
  }

  reset(): void {
    this.clients = [];
    this.assignedIds = new Set();
    this.toAssign = new Set();
    this.pendingRevokeClient = null;
  }

  loadAssignment(): void {
    if (this.state.programId === null) return;
    this.cancelled$.next();
    const programId = this.state.programId;
    const today = toIsoDate(new Date());
    forkJoin({
      overview: this.workspace.getOverview(today, today),
      assigned: this.workspace.getAssignedUserIds(programId),
    })
      .pipe(takeUntil(this.cancelled$), takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({
        next: ({ overview, assigned }) => {
          if (this.state.programId !== programId) return;
          this.clients = overview.clients;
          this.assignedIds = new Set(assigned);
          this.toAssign = new Set();
        },
        error: () => {
          if (this.state.programId !== programId) return;
          this.clients = [];
        },
      });
  }

  get selectedDayClients(): { client: CoachClientOverview; date: string }[] {
    if (!this.state.form.startDate) return [];
    const date = this.state.dateForDay(this.state.selectedDay);
    return this.assignedClients.map((client) => ({ client, date }));
  }

  get newForUserName(): string {
    return this.clients.find((client) => client.userId === this.state.newForUserId)?.username ?? '';
  }

  loadClientsOnly(): void {
    this.cancelled$.next();
    const today = toIsoDate(new Date());
    this.workspace
      .getOverview(today, today)
      .pipe(takeUntil(this.cancelled$), takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({ next: (overview) => (this.clients = overview.clients), error: () => (this.clients = []) });
  }

  toggleAssign(userId: number, checked: boolean): void {
    const next = new Set(this.toAssign);
    if (checked) next.add(userId);
    else next.delete(userId);
    this.toAssign = next;
  }

  get filteredUnassignedClients(): CoachClientOverview[] {
    return this.unassignedClients.filter((client) => matchesSearch(this.clientFilter, client.username, client.email));
  }

  selectVisibleClients(): void {
    const next = new Set(this.toAssign);
    for (const client of this.filteredUnassignedClients) next.add(client.userId);
    this.toAssign = next;
  }

  clearClientSelection(): void {
    this.toAssign = new Set();
  }

  initials(client: CoachClientOverview): string {
    return clientInitials(client);
  }

  get assignedClients(): CoachClientOverview[] {
    return this.clients.filter((client) => this.assignedIds.has(client.userId));
  }

  get unassignedClients(): CoachClientOverview[] {
    return this.clients.filter((client) => !this.assignedIds.has(client.userId));
  }

  askRevoke(client: CoachClientOverview): void {
    if (this.state.programId === null || this.state.busy || !this.assignedIds.has(client.userId)) return;
    this.pendingRevokeClient = client;
  }

  cancelRevoke(): void {
    if (!this.state.busy) this.pendingRevokeClient = null;
  }

  confirmRevoke(): void {
    const client = this.pendingRevokeClient;
    const programId = this.state.programId;
    if (!client || programId === null || this.state.busy || !this.assignedIds.has(client.userId)) return;
    this.state.busy = true;
    this.workspace.revokeProgram(programId, client.userId)
      .pipe(takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({
        next: () => {
          this.state.busy = false;
          this.pendingRevokeClient = null;
          this.assignedIds = new Set([...this.assignedIds].filter((id) => id !== client.userId));
          this.clients = this.clients.map((item) => item.userId === client.userId ? {
            ...item,
            programs: item.programs.filter((program) => program.programId !== programId),
            workouts: item.workouts.filter((workout) => workout.programId !== programId),
          } : item);
          this.effects.showMessage('coachWorkspace.client.revoked', 'success');
        },
        error: (error) => {
          this.state.busy = false;
          this.pendingRevokeClient = null;
          this.effects.showError(error, 'coachWorkspace.client.revokeError');
        },
      });
  }

  assignSelected(): void {
    if (this.state.programId === null || this.toAssign.size === 0 || this.state.busy) return;
    const programId = this.state.programId;
    const ids = [...this.toAssign];
    this.state.busy = true;
    concat(...ids.map((userId) => this.workspace.assignProgram(userId, programId)))
      .pipe(toArray(), takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({
        next: () => {
          this.state.busy = false;
          this.effects.showMessage('coachWorkspace.editor.assigned', 'success');
          this.loadAssignment();
        },
        error: (error) => {
          this.state.busy = false;
          this.effects.showError(error, 'coachWorkspace.client.assignError');
          this.loadAssignment();
        },
      });
  }
}
