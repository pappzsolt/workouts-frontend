import { DestroyRef } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { WorkoutEditorState } from './workout-editor-state';
import { WorkoutMetadataEditor } from './workout-metadata-editor';
import { WorkoutExerciseEditor } from './workout-exercise-editor';

describe('Workout save safety', () => {
  function metadata() {
    TestBed.configureTestingModule({});
    const state = new WorkoutEditorState();
    state.workoutId = 7;
    state.workoutReady = true;
    state.workout.name = 'Saved name';
    state.drafts.beginLoad(state.workout, 7, 'hu', false);
    state.drafts.applyLoaded(state.workout, { ...state.workout }, 7, 'hu', false);
    const navigate = jasmine.createSpy();
    const updateWorkout = jasmine.createSpy().and.returnValue(of({ success: true, data: { status: 'ok' } }));
    const editor = new WorkoutMetadataEditor(state, { updateWorkout } as any,
      { getCurrentLanguage: () => 'hu' } as any, { error() {} } as any, { navigate } as any,
      TestBed.inject(DestroyRef), () => true, { setMessage() {}, loadWorkoutExercises() {} });
    return { state, editor, navigate, updateWorkout };
  }

  it('returns to the list after saving an unchanged form', fakeAsync(() => {
    const { editor, navigate } = metadata();
    editor.saveWorkout();
    tick(1500);
    expect(navigate).toHaveBeenCalledOnceWith(['/coach/workouts']);
  }));

  it('keeps edits entered after a successful save', fakeAsync(() => {
    const { state, editor, navigate, updateWorkout } = metadata();
    editor.saveWorkout();
    expect(editor.canSaveWorkout).toBeTrue();
    state.workout.name = 'New unsaved name';
    tick(1500);
    expect(navigate).not.toHaveBeenCalled();
    expect(state.workout.name).toBe('New unsaved name');
    expect(updateWorkout.calls.mostRecent().args[1].name).toBe('Saved name');
  }));

  it('cancels the old return timer when another save starts, including a failed save', fakeAsync(() => {
    const { state, editor, navigate, updateWorkout } = metadata();
    editor.saveWorkout();
    tick(1000);
    const secondSave = new Subject<any>();
    updateWorkout.and.returnValue(secondSave);
    editor.saveWorkout();
    tick(500);
    expect(navigate).not.toHaveBeenCalled();
    secondSave.error(new Error('offline'));
    tick(1500);
    expect(navigate).not.toHaveBeenCalled();
    expect(state.savingWorkout).toBeFalse();
  }));

  for (const success of [false, true]) {
    it(`updates exercise membership only when assignment success=${success}`, () => {
      TestBed.configureTestingModule({});
      const state = new WorkoutEditorState();
      state.workoutId = 7;
      state.assignmentVerified = true;
      state.selectedExerciseId = 3;
      state.exercises = [{ id: 3, name: 'Squat' } as any];
      const setMessage = jasmine.createSpy();
      const editor = new WorkoutExerciseEditor(state,
        { assignExerciseToWorkout: () => of({ success, message: 'Rejected', data: null }) } as any,
        {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
        TestBed.inject(DestroyRef), { setMessage, loadWorkoutExercises() {} });
      editor.addExerciseToWorkout();
      expect(state.workoutExercises.map(e => e.exerciseId)).toEqual(success ? [3] : []);
      if (success) expect(state.selectedExerciseId).toBeNull();
      else expect(state.selectedExerciseId).toBe(3);
      expect(state.addingExercise).toBeFalse();
      expect(setMessage).toHaveBeenCalledOnceWith(success ? 'coachWorkoutEdit.addSuccess' : 'Rejected', success ? 'success' : 'error');
    });
  }
});
