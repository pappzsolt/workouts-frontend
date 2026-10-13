import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { CoachProgramBuilderWorkoutService } from '../coach-program-builder-workout.service';
import { ProgramWorkoutOccurrenceStore } from './program-workout-occurrence.store';
import { ProgramWorkoutState } from '../../../models/program-workout-state';

describe('Builder workout partial persistence', () => {
  it('retains successful occurrences and reports only successful picker IDs', () => {
    const api = jasmine.createSpyObj('CoachProgramBuilderWorkoutService', ['loadProgramWorkouts', 'addWorkouts']);
    TestBed.configureTestingModule({ providers: [ProgramWorkoutOccurrenceStore,
      { provide: CoachProgramBuilderWorkoutService, useValue: api },
    ] });
    const store = TestBed.inject(ProgramWorkoutOccurrenceStore);
    const workouts = [10, 20].map(id => ({ id, name: String(id), description: '', exercises: [] }));
    api.loadProgramWorkouts.and.returnValue(of({ state: new ProgramWorkoutState(), allWorkouts: workouts, programWorkouts: [] }));
    store.load(7);
    api.addWorkouts.and.returnValue(of([
      { success: true, data: { id: 1, programId: 7, workoutId: 10, dayIndex: 1 }, message: null },
      { success: false, data: null, message: 'failed' },
    ]));
    const completed = jasmine.createSpy('completed');
    store.add([10, 20], completed);
    expect(store.state.assignments.map(row => row.workoutId)).toEqual([10]);
    expect(completed).toHaveBeenCalledOnceWith([10]);
    expect(store.messageType).toBe('error'); expect(store.busy).toBeFalse();
    expect(api.loadProgramWorkouts).toHaveBeenCalledTimes(1);
    api.addWorkouts.and.returnValue(new Subject<any>());
    store.add([20], completed);
    store.load(7);
    expect(api.addWorkouts.calls.mostRecent().args).toEqual([7, [20], 2]);
    expect(api.loadProgramWorkouts).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss pending selections when all additions fail', () => {
    const api = jasmine.createSpyObj('CoachProgramBuilderWorkoutService', ['loadProgramWorkouts', 'addWorkouts']);
    TestBed.configureTestingModule({ providers: [ProgramWorkoutOccurrenceStore,
      { provide: CoachProgramBuilderWorkoutService, useValue: api },
    ] });
    const store = TestBed.inject(ProgramWorkoutOccurrenceStore);
    api.loadProgramWorkouts.and.returnValue(of({ state: new ProgramWorkoutState(), allWorkouts: [], programWorkouts: [] }));
    store.load(7);
    api.addWorkouts.and.returnValue(of([{ success: false, data: null, message: 'failed' }]));
    const completed = jasmine.createSpy('completed');
    store.add([10], completed);
    expect(completed).not.toHaveBeenCalled();
    expect(store.state.assignments).toEqual([]);
    expect(store.messageType).toBe('error');
  });

  it('reloads authoritative state when local day update fails after successful API save', () => {
    const api = jasmine.createSpyObj('CoachProgramBuilderWorkoutService', ['loadProgramWorkouts', 'updateWorkoutDay']);
    TestBed.configureTestingModule({ providers: [ProgramWorkoutOccurrenceStore,
      { provide: CoachProgramBuilderWorkoutService, useValue: api },
    ] });
    const store = TestBed.inject(ProgramWorkoutOccurrenceStore);
    const workout = { id: 10, name: 'Workout', description: '', exercises: [] };
    const oldAssignment = { id: 1, programId: 7, workoutId: 10, dayIndex: 1 };
    const updatedAssignment = { ...oldAssignment, dayIndex: 2 };
    const oldState = new ProgramWorkoutState();
    oldState.load([oldAssignment], [workout]);
    const updatedState = new ProgramWorkoutState();
    updatedState.load([updatedAssignment], [workout]);
    api.loadProgramWorkouts.and.returnValues(
      of({ state: oldState, allWorkouts: [workout], programWorkouts: [oldAssignment] }),
      of({ state: updatedState, allWorkouts: [workout], programWorkouts: [updatedAssignment] }),
    );
    store.load(7);
    spyOn(store.state, 'update').and.throwError('local state desync');
    api.updateWorkoutDay.and.returnValue(of({ success: true, data: updatedAssignment, message: 'saved' }));
    store.updateDay(1, 2);
    expect(api.loadProgramWorkouts).toHaveBeenCalledTimes(2);
    expect(store.state.assignments[0].dayIndex).toBe(2);
    expect(store.messageType).toBe('success');
    expect(store.message).toBe('saved');
  });

});
