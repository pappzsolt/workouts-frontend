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
});
