import { Subject } from 'rxjs';
import type { ApiResponse } from '../../../../../models/backend-dto/common/api-response';
import type { UserWorkoutExerciseDetailDto, UserWorkoutExerciseSetDto } from '../../../../../models/user-workout-exercise-detail.dto';
import { ExerciseSetSaves, ExerciseSetSaveStore, type ExerciseSetSaveEffects } from './exercise-set-saves';

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

  it('keeps silent blur feedback stable even when the server returns a success message', () => {
    saves.createRequest(set, false).subscribe();
    expect(effects.clearMessage).not.toHaveBeenCalled();
    responses[0].next({ success: true, message: 'Set saved', data: null });
    responses[0].complete();
    expect(effects.showSuccess).not.toHaveBeenCalled();
    expect(saves.isSettled(30, 1)).toBeTrue();
    expect(effects.updateExerciseDone).toHaveBeenCalled();
    expect(effects.onSettled).toHaveBeenCalled();
  });

  it('still reports failures from silent saves and clears them on an explicit successful retry', () => {
    saves.createRequest(set, false).subscribe({ error() {} });
    responses[0].next({ success: false, message: 'Save failed', data: null });
    responses[0].complete();
    expect(effects.showError).toHaveBeenCalledWith('Save failed');
    expect(saves.isSettled(30, 1)).toBeFalse();
    saves.createRequest(set, true, true).subscribe();
    expect(effects.clearMessage).toHaveBeenCalled();
    responses[1].next({ success: true, message: 'Completion saved', data: null });
    responses[1].complete();
    expect(effects.showSuccess).toHaveBeenCalledWith('Completion saved', {});
    expect(set.completed).toBeTrue();
    expect(saves.isSettled(30, 1)).toBeTrue();
    expect(effects.selectLastCompletedTimer).toHaveBeenCalledWith(1);
  });

  it('queues an explicit completion behind a silent edit without changing the captured values', () => {
    saves.createRequest(set, false).subscribe();
    saves.createRequest(set, true, true).subscribe();
    expect(update).toHaveBeenCalledTimes(1);
    finish(0);
    expect(update.calls.argsFor(1)).toEqual([30, 40, 50, 60, 1, true, 10, 20, null]);
    expect(effects.showSuccess).not.toHaveBeenCalled();
    finish(1);
    expect(set.completed).toBeTrue();
    expect(saves.isSettled(30, 1)).toBeTrue();
    expect(effects.selectLastCompletedTimer).toHaveBeenCalledWith(1);
  });

  it('paginates and blurs without resending values loaded from the server', () => {
    saves.restoreFailedEdits(30, context.workoutExercise!);
    const paginate = jasmine.createSpy('paginate');

    saves.saveBeforeNavigation(set).subscribe(paginate);
    saves.createRequest(set, false).subscribe();

    expect(paginate).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
  });

  it('waits for an abandoned save and restores its failed edit when detail reopens', () => {
    const store = new ExerciseSetSaveStore();
    const session = store.forSession(1);
    const first = new ExerciseSetSaves({ updateSetCompleted: update } as never, effects, session);
    const reopened = new ExerciseSetSaves({ updateSetCompleted: update } as never, effects, session);
    const loaded = { ...set };
    first.restoreFailedEdits(30, context.workoutExercise!);
    set.actualWeightKg = 25;
    first.createRequest(set, false).subscribe().unsubscribe();
    effects.isDestroyed.and.returnValue(true);
    const loadedExercise = { ...context.workoutExercise!, userWorkoutExerciseSets: [loaded] };
    const restore = jasmine.createSpy('restore').and.callFake(() => reopened.restoreFailedEdits(30, loadedExercise));
    reopened.waitForOccurrence(30).subscribe(restore);
    expect(restore).not.toHaveBeenCalled();

    responses[0].error(new Error('Save failed'));

    expect(restore).toHaveBeenCalledTimes(1);
    expect(loaded.actualWeightKg).toBe(25);
    expect(effects.showError).toHaveBeenCalledTimes(1);
    const fresh = new ExerciseSetSaves({ updateSetCompleted: update } as never, effects, store.forSession(2));
    const freshSet = { ...loaded, actualWeightKg: 20 };
    fresh.restoreFailedEdits(30, { ...loadedExercise, userWorkoutExerciseSets: [freshSet] });
    expect(freshSet.actualWeightKg).toBe(20);
  });

  it('does not dispatch a queued write after the original login session ends', () => {
    let signedIn = true;
    const store = new ExerciseSetSaveStore();
    saves = new ExerciseSetSaves({ updateSetCompleted: update } as never, effects, store.forSession(1), () => signedIn);
    saves.createRequest(set).subscribe();
    set.actualWeightKg = 25;
    const failed = jasmine.createSpy('failed');
    saves.createRequest(set).subscribe({ error: failed });
    signedIn = false;
    finish(0);

    expect(update).toHaveBeenCalledTimes(1);
    expect(failed).toHaveBeenCalledOnceWith(new Error('authErrors.sessionEnded'));
  });

});
