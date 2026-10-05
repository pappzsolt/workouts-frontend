import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AssignProgramService } from '../assign-program/assignprogram.service';
import { ProgramBuilderAssignmentStore } from './program-builder-assignment.store';

describe('ProgramBuilderAssignmentStore', () => {
  it('retries only the failed user after a partially successful assignment', () => {
    const api = jasmine.createSpyObj<AssignProgramService>('AssignProgramService', ['getAssignedUserIds', 'assignProgramToUser']);
    TestBed.configureTestingModule({ providers: [ProgramBuilderAssignmentStore, { provide: AssignProgramService, useValue: api }] });
    const store = TestBed.inject(ProgramBuilderAssignmentStore);
    store.state.loadAssigned([11]); store.state.select([11, 22, 33]); store.selectionReady = true;
    api.assignProgramToUser.and.callFake(userId => userId === 22
      ? of({ success: true, data: null, message: null })
      : throwError(() => new Error('real failure')));
    const failed = jasmine.createSpy('failed'); const completed = jasmine.createSpy('completed');
    store.save(7).subscribe({ next: completed, error: failed });
    expect(failed).toHaveBeenCalled(); expect(completed).not.toHaveBeenCalled();
    expect(store.state.assignedUserIds).toEqual([11, 22]); expect(store.busy).toBeFalse();
    api.assignProgramToUser.calls.reset();
    api.assignProgramToUser.and.returnValue(of({ success: true, data: null, message: null }));
    store.save(7).subscribe({ next: completed });
    expect(api.assignProgramToUser.calls.allArgs()).toEqual([[33, 7]]);
    expect(store.state.assignedUserIds).toEqual([11, 22, 33]); expect(completed).toHaveBeenCalledTimes(1);
  });
});
