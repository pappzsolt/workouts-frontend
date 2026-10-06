import { of, Subject, throwError } from 'rxjs';
import { ProgramWorkoutsAssComponent } from './program-workouts-ass.component';
import { ProgramWorkoutService } from '../../../../services/coach/program-workout.service';

const ok = (data: any = null) => ({ success: true, data, message: null });
const row = (id: number, workoutId: number, dayIndex: number) => ({ id, programId: 7, workoutId, dayIndex });

describe('ProgramWorkoutsAssComponent persistence', () => {
  let api: jasmine.SpyObj<ProgramWorkoutService>;
  let component: ProgramWorkoutsAssComponent;
  beforeEach(() => {
    api = jasmine.createSpyObj('ProgramWorkoutService', ['getWorkoutsForProgram', 'addWorkoutToProgram', 'deleteProgramWorkout']);
    component = new ProgramWorkoutsAssComponent(api, {} as any, {} as any);
  });
  afterEach(() => component.ngOnDestroy());

  it('cancels the previous program read on program selection', () => {
    const old = new Subject<any>(); const current = new Subject<any>();
    api.getWorkoutsForProgram.and.returnValues(old, current);
    component.onProgramSelected(1); component.onProgramSelected(7);
    current.next(ok([row(2, 20, 3)])); current.complete();
    old.next(ok([row(1, 10, 1)]));
    expect(component.selectedWorkoutIds).toEqual([20]);
    expect(component.loadingAssignments).toBeFalse();
  });

  it('saves only additions and preserves existing day indices', () => {
    api.getWorkoutsForProgram.and.returnValue(of(ok([row(1, 10, 4)])));
    component.onProgramSelected(7); component.onWorkoutsChange([10, 20]);
    api.addWorkoutToProgram.and.returnValue(of({ ...ok(row(2, 20, 5)), message: 'Workout added' }));
    component.saveSelectedWorkouts();
    expect(component.message).toBe('Workout added');
    component.saveSelectedWorkouts();
    expect(api.addWorkoutToProgram.calls.allArgs()).toEqual([[7, 20, 5]]);
    expect(component.programWorkoutAssignments.length).toBe(2);
  });

  it('saves an empty selection by deleting every persisted relationship', () => {
    api.getWorkoutsForProgram.and.returnValue(of(ok([row(1, 10, 1), row(2, 10, 3)])));
    api.deleteProgramWorkout.and.returnValue(of(ok()));
    component.onProgramSelected(7); component.onWorkoutsChange([]); component.saveSelectedWorkouts();
    expect(api.deleteProgramWorkout.calls.allArgs()).toEqual([[1], [2]]);
    expect(component.programWorkoutAssignments).toEqual([]);
  });

  it('removes only the specified occurrence of a repeated workout', () => {
    api.getWorkoutsForProgram.and.returnValue(of(ok([row(1, 10, 1), row(2, 10, 3)])));
    api.deleteProgramWorkout.and.returnValue(of(ok()));
    component.onProgramSelected(7); component.removeWorkout(2);
    expect(api.deleteProgramWorkout.calls.allArgs()).toEqual([[2]]);
    expect(component.selectedWorkoutIds).toEqual([10]);
    expect(component.programWorkoutAssignments.map(item => item.id)).toEqual([1]);
  });

  it('retries only remaining additions after partial success', () => {
    api.getWorkoutsForProgram.and.returnValue(of(ok([])));
    component.onProgramSelected(7); component.onWorkoutsChange([10, 20]);
    api.addWorkoutToProgram.and.returnValues(of(ok(row(1, 10, 1))), throwError(() => new Error('failed')));
    component.saveSelectedWorkouts();
    expect(component.busy).toBeFalse();
    api.addWorkoutToProgram.calls.reset(); api.addWorkoutToProgram.and.returnValue(of(ok(row(2, 20, 2))));
    component.saveSelectedWorkouts();
    expect(api.addWorkoutToProgram.calls.allArgs()).toEqual([[7, 20, 2]]);
  });

  it('blocks saves after a failed assignment read', () => {
    api.getWorkoutsForProgram.and.returnValue(of({ success: false, data: null, message: 'failed' }));
    component.onProgramSelected(7); component.saveSelectedWorkouts();
    expect(api.addWorkoutToProgram).not.toHaveBeenCalled();
    expect(api.deleteProgramWorkout).not.toHaveBeenCalled();
  });
});
