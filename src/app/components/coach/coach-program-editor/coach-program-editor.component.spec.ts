import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { CoachClientOverview } from '../../../models/coach-workspace.model';
import { CoachProgramEditorComponent } from './coach-program-editor.component';

const client = (userId: number): CoachClientOverview => ({
  userId, username: `Client ${userId}`, email: `${userId}@example.com`,
  age: null, weight: null, height: null, gender: null, goals: null, lastCompletedAt: null,
  programs: [{ programId: 10, name: 'Program', startDate: null, endDate: null, totalWorkouts: 2, completedWorkouts: 1 }],
  workouts: [],
});

describe('Program editor assignment revocation', () => {
  let component: CoachProgramEditorComponent;
  let request: Subject<void>;
  let revoke: jasmine.Spy;

  beforeEach(() => {
    request = new Subject<void>();
    revoke = jasmine.createSpy('revokeProgram').and.returnValue(request);
    TestBed.configureTestingModule({ providers: [
      { provide: CoachWorkspaceService, useValue: { revokeProgram: revoke } },
      { provide: ActivatedRoute, useValue: {} },
      { provide: Router, useValue: {} },
    ] });
    component = TestBed.runInInjectionContext(() => new CoachProgramEditorComponent());
    component.state.programId = 10;
    component.assignments.clients = [client(1), client(2), client(3)];
    component.assignments.assignedIds = new Set([1, 2]);
  });

  it('requires confirmation and lets the coach cancel without sending a request', () => {
    component.assignments.askRevoke(component.assignments.clients[0]);
    expect(component.assignments.pendingRevokeClient?.userId).toBe(1);
    expect(revoke).not.toHaveBeenCalled();
    component.assignments.cancelRevoke();
    component.assignments.confirmRevoke();
    expect(component.assignments.pendingRevokeClient).toBeNull();
    expect(revoke).not.toHaveBeenCalled();
    expect([...component.assignments.assignedIds]).toEqual([1, 2]);
  });

  it('revokes only the selected assignment and makes the client available for reassignment', () => {
    component.assignments.toAssign = new Set([3]);
    component.assignments.askRevoke(component.assignments.clients[0]);
    component.assignments.confirmRevoke();
    expect(revoke).toHaveBeenCalledOnceWith(10, 1);
    expect(component.state.busy).toBeTrue();
    expect(component.assignments.assignedIds.has(1)).toBeTrue();
    component.assignments.confirmRevoke();
    component.assignments.cancelRevoke();
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(component.assignments.pendingRevokeClient?.userId).toBe(1);
    request.next();
    request.complete();
    expect(component.state.busy).toBeFalse();
    expect(component.assignments.pendingRevokeClient).toBeNull();
    expect(component.assignments.assignedClients.map(item => item.userId)).toEqual([2]);
    expect(component.assignments.unassignedClients.map(item => item.userId)).toEqual([1, 3]);
    expect(component.assignments.clients[0].programs).toEqual([]);
    expect(component.assignments.clients[1].programs.length).toBe(1);
    expect(component.assignments.toAssign.has(3)).toBeTrue();
    expect(component.state.message).toBe('coachWorkspace.client.revoked');
  });

  it('preserves the assignment on failure and allows retrying', () => {
    component.assignments.askRevoke(component.assignments.clients[0]);
    component.assignments.confirmRevoke();
    request.error({});
    expect(component.state.busy).toBeFalse();
    expect(component.assignments.pendingRevokeClient).toBeNull();
    expect([...component.assignments.assignedIds]).toEqual([1, 2]);
    expect(component.state.message).toBe('coachWorkspace.client.revokeError');
    request = new Subject<void>();
    revoke.and.returnValue(request);
    component.assignments.askRevoke(component.assignments.clients[0]);
    component.assignments.confirmRevoke();
    expect(revoke).toHaveBeenCalledTimes(2);
  });

  it('does not revoke an unassigned client or a missing program', () => {
    component.assignments.askRevoke(component.assignments.clients[2]);
    expect(component.assignments.pendingRevokeClient).toBeNull();
    component.assignments.askRevoke(component.assignments.clients[0]);
    component.state.programId = null;
    component.assignments.confirmRevoke();
    expect(revoke).not.toHaveBeenCalled();
  });
});
