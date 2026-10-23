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
    component.programId = 10;
    component.clients = [client(1), client(2), client(3)];
    component.assignedIds = new Set([1, 2]);
  });

  it('requires confirmation and lets the coach cancel without sending a request', () => {
    component.askRevoke(component.clients[0]);
    expect(component.pendingRevokeClient?.userId).toBe(1);
    expect(revoke).not.toHaveBeenCalled();
    component.cancelRevoke();
    component.confirmRevoke();
    expect(component.pendingRevokeClient).toBeNull();
    expect(revoke).not.toHaveBeenCalled();
    expect([...component.assignedIds]).toEqual([1, 2]);
  });

  it('revokes only the selected assignment and makes the client available for reassignment', () => {
    component.toAssign = new Set([3]);
    component.askRevoke(component.clients[0]);
    component.confirmRevoke();
    expect(revoke).toHaveBeenCalledOnceWith(10, 1);
    expect(component.busy).toBeTrue();
    expect(component.assignedIds.has(1)).toBeTrue();
    component.confirmRevoke();
    component.cancelRevoke();
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(component.pendingRevokeClient?.userId).toBe(1);
    request.next();
    request.complete();
    expect(component.busy).toBeFalse();
    expect(component.pendingRevokeClient).toBeNull();
    expect(component.assignedClients.map(item => item.userId)).toEqual([2]);
    expect(component.unassignedClients.map(item => item.userId)).toEqual([1, 3]);
    expect(component.clients[0].programs).toEqual([]);
    expect(component.clients[1].programs.length).toBe(1);
    expect(component.toAssign.has(3)).toBeTrue();
    expect(component.message).toBe('coachWorkspace.client.revoked');
  });

  it('preserves the assignment on failure and allows retrying', () => {
    component.askRevoke(component.clients[0]);
    component.confirmRevoke();
    request.error({});
    expect(component.busy).toBeFalse();
    expect(component.pendingRevokeClient).toBeNull();
    expect([...component.assignedIds]).toEqual([1, 2]);
    expect(component.message).toBe('coachWorkspace.client.revokeError');
    request = new Subject<void>();
    revoke.and.returnValue(request);
    component.askRevoke(component.clients[0]);
    component.confirmRevoke();
    expect(revoke).toHaveBeenCalledTimes(2);
  });

  it('does not revoke an unassigned client or a missing program', () => {
    component.askRevoke(component.clients[2]);
    expect(component.pendingRevokeClient).toBeNull();
    component.askRevoke(component.clients[0]);
    component.programId = null;
    component.confirmRevoke();
    expect(revoke).not.toHaveBeenCalled();
  });
});
