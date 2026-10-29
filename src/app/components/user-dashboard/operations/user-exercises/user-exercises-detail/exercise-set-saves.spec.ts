import { Subject } from 'rxjs';
import type { ApiResponse } from '../../../../../models/backend-dto/common/api-response';
import type { UserWorkoutExerciseDetailDto, UserWorkoutExerciseSetDto } from '../../../../../models/user-workout-exercise-detail.dto';
import { ExerciseSetSaves, type ExerciseSetSaveEffects } from './exercise-set-saves';

describe('Exercise set save queue', () => {
  let saves: ExerciseSetSaves;
  let set: UserWorkoutExerciseSetDto;
  let responses: Subject<ApiResponse<void>>[];
  let update: jasmine.Spy;
  let effects: jasmine.SpyObj<ExerciseSetSaveEffects>;
  let context: ReturnType<ExerciseSetSaveEffects['context']>;

  beforeEach(() => {
    responses = [];
    set = { id: 1, userWorkoutExerciseId: 11, setNumber: 1, completed: false, targetRepetitions: 10,
      targetWeightKg: 20, actualRepetitions: 10, actualWeightKg: 20, notes: null, startedAt: null, completedAt: null };
    context = { userWorkoutId: 30, programId: 40, workoutId: 50,
      workoutExercise: { exercise: { id: 60 }, userWorkoutExerciseSets: [set] } as UserWorkoutExerciseDetailDto };
    effects = jasmine.createSpyObj('effects', ['context', 'validateInputs', 'clearMessage', 'showSuccess', 'showError',
      'selectLastCompletedTimer', 'updateExerciseDone', 'isDestroyed', 'onSettled']);
    effects.context.and.callFake(() => context);
    effects.validateInputs.and.returnValue(true);
    effects.isDestroyed.and.returnValue(false);
    update = jasmine.createSpy('updateSetCompleted').and.callFake(() => {
      const response = new Subject<ApiResponse<void>>(); responses.push(response); return response;
    });
    saves = new ExerciseSetSaves({ updateSetCompleted: update } as never, effects);
  });

  function finish(index: number): void {
    responses[index].next({ success: true, message: null, data: null });
    responses[index].complete();
  }

  it('shares identical saves and finishes HTTP work after all UI subscribers detach', () => {
    const request = saves.createRequest(set);
    const first = request.subscribe();
    const same = saves.createRequest(set);
    const second = same.subscribe();
    expect(same).toBe(request);
    expect(update).toHaveBeenCalledTimes(1);
    first.unsubscribe(); second.unsubscribe();
    effects.isDestroyed.and.returnValue(true);
    expect(responses[0].observed).toBeTrue();
    finish(0);
    expect(saves.isSettled(30, 1)).toBeTrue();
    expect(effects.onSettled).not.toHaveBeenCalled();
  });

  it('preserves queued identifiers and values after the route and form change', () => {
    saves.createRequest(set).subscribe();
    set.actualWeightKg = 25;
    saves.createRequest(set).subscribe();
    set.actualWeightKg = 99;
    context = { ...context, userWorkoutId: 999, programId: 888, workoutId: 777, workoutExercise: undefined };
    finish(0);
    expect(update.calls.argsFor(1)).toEqual([30, 40, 50, 60, 1, false, 10, 25, null]);
    finish(1);
    expect(effects.showSuccess).not.toHaveBeenCalled();
    expect(effects.selectLastCompletedTimer).not.toHaveBeenCalled();
    expect(effects.onSettled).not.toHaveBeenCalled();
  });

  it('allows different sets to save independently', () => {
    saves.createRequest(set).subscribe();
    saves.createRequest({ ...set, id: 2 }).subscribe();
    expect(update).toHaveBeenCalledTimes(2);
    finish(1);
    expect(saves.isSettled(30, 2)).toBeTrue();
    expect(saves.isSettled(30, 1)).toBeFalse();
    finish(0);
  });

  it('keeps a failed completion unsettled until a retry is confirmed', () => {
    saves.createRequest(set, true, true).subscribe({ error() {} });
    responses[0].next({ success: false, message: 'Not saved', data: null });
    responses[0].complete();
    expect(set.completed).toBeFalse();
    expect(saves.isSettled(30, 1)).toBeFalse();
    expect(effects.showError).toHaveBeenCalledWith('Not saved');
    saves.createRequest(set, true, true).subscribe();
    finish(1);
    expect(saves.isSettled(30, 1)).toBeTrue();
    expect(set.completed).toBeTrue();
    expect(effects.selectLastCompletedTimer).toHaveBeenCalledWith(1);
  });

  it('snapshots effort values when the edit is queued', () => {
    set.actualRpe = 8; set.rir = 2;
    saves.createRequest(set).subscribe();
    set.actualRpe = 9;
    saves.createRequest(set).subscribe();
    set.actualRpe = 10;
    finish(0);
    expect(update.calls.argsFor(0).slice(-2)).toEqual([8, 2]);
    expect(update.calls.argsFor(1).slice(-2)).toEqual([9, 2]);
    finish(1);
  });

  it('does not submit invalid inputs or change completion optimistically', () => {
    effects.validateInputs.and.returnValue(false);
    saves.createRequest(set, true, true).subscribe();
    expect(set.completed).toBeFalse();
    expect(update).not.toHaveBeenCalled();
    expect(effects.clearMessage).not.toHaveBeenCalled();
  });
});
