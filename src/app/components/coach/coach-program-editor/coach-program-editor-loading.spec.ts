import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { EMPTY, Subject, of } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { CoachProgram } from '../../../models/coach-workspace.model';
import { CoachProgramEditorComponent } from './coach-program-editor.component';

const program = (id: number): CoachProgram => ({
  programId: id, programName: `Program ${id}`, programDescription: '',
  durationDays: 1, difficultyLevel: 'BEGINNER', startDate: '2026-10-23', endDate: '2026-10-23', workouts: [],
});
const respond = <T>(request: Subject<T>, value: T): void => {
  request.next(value);
  request.complete();
};

describe('Program editor loading regressions', () => {
  let component: CoachProgramEditorComponent;
  let route: Subject<ParamMap>;
  let first: Subject<CoachProgram>;
  let second: Subject<CoachProgram>;
  let workspace: {
    getProgram: jasmine.Spy; getProgramDays: jasmine.Spy; getOverview: jasmine.Spy;
    getAssignedUserIds: jasmine.Spy; getMyWorkouts: jasmine.Spy; updateProgram: jasmine.Spy;
  };

  beforeEach(() => {
    route = new Subject<ParamMap>();
    first = new Subject<CoachProgram>();
    second = new Subject<CoachProgram>();
    workspace = {
      getProgram: jasmine.createSpy().and.callFake((id: number) => id === 1 ? first : second),
      getProgramDays: jasmine.createSpy().and.returnValue(of([])),
      getOverview: jasmine.createSpy().and.returnValue(of({ clients: [] })),
      getAssignedUserIds: jasmine.createSpy().and.returnValue(of([])),
      getMyWorkouts: jasmine.createSpy().and.returnValue(of([])),
      updateProgram: jasmine.createSpy().and.returnValue(EMPTY),
    };
    TestBed.configureTestingModule({ providers: [
      { provide: CoachWorkspaceService, useValue: workspace },
      { provide: ActivatedRoute, useValue: { paramMap: route, snapshot: { queryParamMap: convertToParamMap({}) } } },
      { provide: Router, useValue: { navigate: jasmine.createSpy() } },
    ] });
    component = TestBed.runInInjectionContext(() => new CoachProgramEditorComponent());
    component.ngOnInit();
  });

  it('keeps the latest program when earlier responses arrive afterwards', () => {
    route.next(convertToParamMap({ id: '1' }));
    route.next(convertToParamMap({ id: '2' }));
    respond(second, program(2));
    respond(first, program(1));
    expect(component.state.programId).toBe(2);
    expect(component.state.program?.programId).toBe(2);
    expect(component.state.form.programName).toBe('Program 2');
    expect(component.state.loading).toBeFalse();
    expect(workspace.getAssignedUserIds).toHaveBeenCalledOnceWith(2);
    component.state.form.programName = 'Edited program 2';
    component.details.saveDetails();
    expect(workspace.updateProgram).toHaveBeenCalledOnceWith(2, jasmine.objectContaining({ programName: 'Edited program 2' }));
  });

  it('ignores an old error without ending the latest loading state', () => {
    route.next(convertToParamMap({ id: '1' }));
    route.next(convertToParamMap({ id: '2' }));
    first.error(new Error('old failure'));
    expect(component.state.loading).toBeTrue();
    expect(component.state.message).toBe('');
    respond(second, program(2));
    expect(component.state.loading).toBeFalse();
  });

  it('cancels an earlier reload even if the program ID is unchanged', () => {
    workspace.getProgram.and.returnValues(first, second);
    route.next(convertToParamMap({ id: '1' }));
    route.next(convertToParamMap({ id: '1' }));
    respond(second, { ...program(1), programName: 'Newest version' });
    respond(first, program(1));
    expect(component.state.form.programName).toBe('Newest version');
  });

  it('does not let old assignment responses populate a different program', () => {
    const oldAssignments = new Subject<number[]>();
    workspace.getAssignedUserIds.and.callFake((id: number) => id === 1 ? oldAssignments : of([22]));
    route.next(convertToParamMap({ id: '1' }));
    respond(first, program(1));
    route.next(convertToParamMap({ id: '2' }));
    respond(second, program(2));
    respond(oldAssignments, [11]);
    expect([...component.assignments.assignedIds]).toEqual([22]);
  });

  it('cancels pending responses when switching to a new program', () => {
    route.next(convertToParamMap({ id: '1' }));
    route.next(convertToParamMap({ id: 'new' }));
    respond(first, program(1));
    expect(component.state.programId).toBeNull();
    expect(component.state.program).toBeNull();
    expect(component.state.form.programName).toBe('');
    expect(component.state.loading).toBeFalse();
  });

  it('prevents saving old form data while the new program is loading or its load failed', () => {
    route.next(convertToParamMap({ id: '1' }));
    respond(first, program(1));
    route.next(convertToParamMap({ id: '2' }));
    component.details.saveDetails();
    expect(workspace.updateProgram).not.toHaveBeenCalled();
    second.error(new Error('current failure'));
    component.details.saveDetails();
    expect(workspace.updateProgram).not.toHaveBeenCalled();
    expect(component.state.loading).toBeFalse();
    expect(component.state.message).toBe('current failure');
  });
});
