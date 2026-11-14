import { LanguageService } from '../../../services/shared/language.service';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { CoachProgram } from '../../../models/coach-workspace.model';
import { CoachProgramEditorComponent } from './coach-program-editor.component';

const program: CoachProgram = {
  programId: 10, programName: 'Strength', programDescription: 'Base', durationDays: 28,
  difficultyLevel: 'BEGINNER', startDate: '2026-10-23', endDate: null, workouts: [{
    programWorkoutId: 30, workoutId: 20, name: 'Squat', description: '',
    exercises: [{ id: 5, name: 'Squat', description: '', sets: 3, repetitions: 5, restSeconds: 120, notes: null }],
  }],
};

describe('Coach program editor unsaved navigation protection', () => {
  function create(id: 'new' | '10' = '10') {
    const save = new Subject<void>();
    const loaded = { ...program };
    TestBed.configureTestingModule({ providers: [{ provide: LanguageService, useValue: { getCurrentLanguage: () => 'hu', language$: of('hu') } },
      { provide: CoachWorkspaceService, useValue: {
        getProgram: () => of(loaded),
        getProgramDays: () => of([{ id: 30, programId: 10, workoutId: 20, dayIndex: 1 }]),
        getOverview: () => of({ clients: [] }), getAssignedUserIds: () => of([]),
        getMyWorkouts: () => of([]), updateProgram: () => save,
      } },
      { provide: ActivatedRoute, useValue: {
        paramMap: of(convertToParamMap({ id })), snapshot: { queryParamMap: convertToParamMap({}) },
      } },
      { provide: Router, useValue: { navigate: jasmine.createSpy('navigate').and.resolveTo(true) } },
    ] });
    const component = TestBed.runInInjectionContext(() => new CoachProgramEditorComponent());
    component.ngOnInit();
    return { component, save, loaded };
  }

  it('allows clean navigation but waits for confirmation when metadata changes', () => {
    const { component } = create();
    expect(component.canLeave()).toBeTrue();
    component.state.form.programName = 'Edited';
    let decision: boolean | null = null;
    const answer = component.canLeave();
    expect(answer).not.toBeTrue();
    if (typeof answer !== 'boolean') answer.subscribe(value => decision = value);
    expect(component.leaveConfirmationOpen).toBeTrue();
    component.cancelLeave();
    expect(decision).toBeFalse();
    expect(component.state.form.programName).toBe('Edited');
    const next = component.canLeave();
    if (typeof next !== 'boolean') next.subscribe(value => decision = value);
    component.confirmLeave();
    expect(decision).toBeTrue();
  });

  it('protects new program form edits and an unfinished day draft', () => {
    const { component } = create('new');
    expect(component.canLeave()).toBeTrue();
    component.state.form.programName = 'New program';
    expect(component.canLeave()).not.toBeTrue();
    component.cancelLeave();
  });

  it('protects unsaved workout drafts and selected athletes', () => {
    const { component } = create();
    component.selectDay(2);
    component.library.workoutName = 'Unsaved workout';
    expect(component.canLeave()).not.toBeTrue();
    component.cancelLeave();
    component.library.workoutName = '';
    component.assignments.toAssign.add(7);
    expect(component.canLeave()).not.toBeTrue();
    component.cancelLeave();
  });

  it('blocks leaving during a save, then uses the last successful baseline', () => {
    const { component, save, loaded } = create();
    component.state.form.programName = 'Saved name';
    component.details.saveDetails();
    expect(component.canLeave()).toBeFalse();
    loaded.programName = 'Saved name';
    save.next(); save.complete();
    // The metadata submitted in the request was stored; no unsaved edits remain.
    expect(component.canLeave()).toBeTrue();
  });

  it('protects browser reload when dirty', () => {
    const { component } = create();
    const event = { preventDefault: jasmine.createSpy('preventDefault'), returnValue: undefined as string | undefined };
    component.beforeUnload(event as unknown as BeforeUnloadEvent);
    expect(event.preventDefault).not.toHaveBeenCalled();
    component.state.form.programDescription = 'Changed';
    component.beforeUnload(event as unknown as BeforeUnloadEvent);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.returnValue).toBe('');
  });
});
