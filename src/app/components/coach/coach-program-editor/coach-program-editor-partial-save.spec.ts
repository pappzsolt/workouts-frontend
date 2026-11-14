import { LanguageService } from '../../../services/shared/language.service';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { CoachProgram } from '../../../models/coach-workspace.model';
import { CoachProgramEditorComponent } from './coach-program-editor.component';

const program: CoachProgram = {
  programId: 10, programName: 'Strength', programDescription: '', durationDays: 28,
  difficultyLevel: 'BEGINNER', startDate: '2026-10-23', endDate: null, workouts: [],
};

describe('Coach program partial save notifications', () => {
  it('warns if workout creation succeeded but replacing exercises failed', () => {
    const created = new Subject<number>();
    const attached = new Subject<void>();
    const workspace = {
      getProgram: () => of(program), getProgramDays: () => of([]),
      getOverview: () => of({ clients: [] }), getAssignedUserIds: () => of([]), getMyWorkouts: () => of([]),
      createWorkout: jasmine.createSpy().and.returnValue(created),
      replaceWorkoutExercises: jasmine.createSpy().and.returnValue(attached),
      addWorkoutToDay: jasmine.createSpy().and.returnValue(of(undefined)),
    };
    TestBed.configureTestingModule({ providers: [{ provide: LanguageService, useValue: { getCurrentLanguage: () => 'hu', language$: of('hu') } },
      { provide: CoachWorkspaceService, useValue: workspace },
      { provide: ActivatedRoute, useValue: {
        paramMap: of(convertToParamMap({ id: '10' })), snapshot: { queryParamMap: convertToParamMap({}) },
      } },
      { provide: Router, useValue: {} },
    ] });
    const component = TestBed.runInInjectionContext(() => new CoachProgramEditorComponent());
    component.ngOnInit();
    component.library.workoutName = 'New training';
    component.library.pendingExercises = [{ id: 1, name: 'Squat' } as never];
    component.library.createWorkoutForDay();
    created.next(22); created.complete();
    attached.error(new Error('Request rejected'));
    expect(component.state.messageType).toBe('error');
    expect(component.state.message).toBe('coachWorkspace.editor.partialWorkoutCreated');
    expect(component.state.messageParams).toEqual({});
    expect(component.state.busy).toBeFalse();
  });
  it('shows the number already added when a later multi-add request fails', () => {
    const first = new Subject<void>();
    const second = new Subject<void>();
    const add = jasmine.createSpy('addWorkoutToDay').and.returnValues(first, second);
    TestBed.configureTestingModule({ providers: [{ provide: LanguageService, useValue: { getCurrentLanguage: () => 'hu', language$: of('hu') } },
      { provide: CoachWorkspaceService, useValue: {
        getProgram: () => of(program), getProgramDays: () => of([]),
        getOverview: () => of({ clients: [] }), getAssignedUserIds: () => of([]), getMyWorkouts: () => of([]),
        addWorkoutToDay: add,
      } },
      { provide: ActivatedRoute, useValue: {
        paramMap: of(convertToParamMap({ id: '10' })), snapshot: { queryParamMap: convertToParamMap({}) },
      } },
      { provide: Router, useValue: {} },
    ] });
    const component = TestBed.runInInjectionContext(() => new CoachProgramEditorComponent());
    component.ngOnInit();
    component.library.multiSelected = [41, 42];
    component.library.addMultiple();
    expect(add).toHaveBeenCalledTimes(2); // Observables constructed, but subscribed in sequence.
    first.next(); first.complete();
    second.error(new Error('offline'));
    expect(component.state.message).toBe('coachWorkspace.editor.partialMultiAdded');
    expect(component.state.messageType).toBe('error');
    expect(component.state.messageParams).toEqual({ count: 1, total: 2 });
  });

});
