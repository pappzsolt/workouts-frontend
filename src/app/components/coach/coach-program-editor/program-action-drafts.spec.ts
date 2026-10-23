import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import { CoachProgramEditorComponent } from './coach-program-editor.component';
import type { CoachProgram } from '../../../models/coach-workspace.model';

describe('Program action draft preservation', () => {
  function create() {
    const program: CoachProgram = {
      programId: 10, programName: 'Test', programDescription: '', durationDays: 28,
      difficultyLevel: 'BEGINNER', startDate: '2026-10-23', endDate: null,
      workouts: [{programWorkoutId: 11, workoutId: 7, name: 'Workout', description: '',
        exercises: [{id: 12, name: 'Squat', description: '', sets: 3, repetitions: 10, restSeconds: 60, notes: ''}]}],
    };
    const save = new Subject<void>();
    const update = jasmine.createSpy('updatePrescription').and.returnValue(save);
    TestBed.configureTestingModule({providers: [
      {provide: CoachWorkspaceService, useValue: {
        getProgram: () => of(program), getProgramDays: () => of([{id: 11, programId: 10, workoutId: 7, dayIndex: 1}]),
        getOverview: () => of({clients: []}), getAssignedUserIds: () => of([]),
        addWorkoutToDay: () => of(undefined), updatePrescription: update,
      }}, {provide: ActivatedRoute, useValue: {}}, {provide: Router, useValue: {}},
    ]});
    const component = TestBed.runInInjectionContext(() => new CoachProgramEditorComponent());
    component.programId = 10;
    (component as any).loadProgram(1);
    return {component, program, save, update};
  }

  for (const action of ['repeatWeekly', 'addToAnotherDay'] as const) {
    it(`${action} preserves an unsaved prescription`, () => {
      const {component} = create();
      component.rows[0].sets = 5;
      component.extraDate = '2026-10-24';
      component[action]();
      expect(component.rows[0].sets).toBe(5);
      expect(component.changedCount).toBe(1);
      expect(component.pendingDay).toBeNull();
    });
  }

  it('prescription save preserves a later edit while its request is pending', () => {
    const {component, program, save, update} = create();
    component.rows[0].sets = 5;
    component.savePrescriptions();
    component.rows[0].sets = 7;
    program.workouts[0].exercises[0].sets = 5;
    save.next(); save.complete();
    expect(update.calls.first().args[2].sets).toBe(5);
    expect(component.rows[0].sets).toBe(7);
    expect(component.rows[0].original.sets).toBe(5);
    expect(component.changedCount).toBe(1);
  });
  it('marks unchanged submitted values as saved', () => {
    const {component, program, save} = create();
    component.rows[0].sets = 5;
    component.savePrescriptions();
    program.workouts[0].exercises[0].sets = 5;
    save.next(); save.complete();
    expect(component.rows[0].sets).toBe(5);
    expect(component.changedCount).toBe(0);
  });

  it('preserves newer repetitions and rest while updating their saved baselines', () => {
    const {component, program, save} = create();
    component.rows[0].repetitions = 12;
    component.rows[0].restSeconds = 90;
    component.savePrescriptions();
    component.rows[0].repetitions = 15;
    component.rows[0].restSeconds = 120;
    Object.assign(program.workouts[0].exercises[0], {repetitions: 12, restSeconds: 90});
    save.next(); save.complete();
    expect(component.rows[0].repetitions).toBe(15);
    expect(component.rows[0].restSeconds).toBe(120);
    expect(component.rows[0].original).toEqual({sets: 3, repetitions: 12, restSeconds: 90});
    expect(component.changedCount).toBe(1);
  });

  it('preserves reverting to the old value while a new value is being saved', () => {
    const {component, program, save} = create();
    component.rows[0].sets = 5;
    component.savePrescriptions();
    component.rows[0].sets = 3;
    program.workouts[0].exercises[0].sets = 5;
    save.next(); save.complete();
    expect(component.rows[0].sets).toBe(3);
    expect(component.rows[0].original.sets).toBe(5);
    expect(component.changedCount).toBe(1);
  });

  it('preserves prescription edits after a failed weekly repeat', () => {
    const {component} = create();
    spyOn(TestBed.inject(CoachWorkspaceService), 'addWorkoutToDay').and.returnValue(throwError(() => new Error('Rejected')));
    component.rows[0].sets = 5;
    component.repeatWeekly();
    expect(component.rows[0].sets).toBe(5);
    expect(component.rows[0].original.sets).toBe(3);
    expect(component.changedCount).toBe(1);
    expect(component.messageType).toBe('error');
  });

  it('preserves edits made while the post-save reload is pending', () => {
    const {component, program, save} = create();
    const reload = new Subject<CoachProgram>();
    spyOn(TestBed.inject(CoachWorkspaceService), 'getProgram').and.returnValue(reload);
    component.rows[0].sets = 5;
    component.savePrescriptions();
    save.next(); save.complete();
    component.rows[0].sets = 7;
    program.workouts[0].exercises[0].sets = 5;
    reload.next(program); reload.complete();
    expect(component.rows[0].sets).toBe(7);
    expect(component.rows[0].original.sets).toBe(5);
    expect(component.changedCount).toBe(1);
  });

});
