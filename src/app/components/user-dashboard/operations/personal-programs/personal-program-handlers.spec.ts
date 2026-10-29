import { DestroyRef, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { NgForm } from '@angular/forms';
import { Subject } from 'rxjs';
import type { PersonalProgramDetail } from '../../../../models/personal-program.model';
import { PersonalProgramState } from './personal-program-state';
import { PersonalProgramDays } from './personal-program-days';
import { PersonalProgramNavigation } from './personal-program-navigation';
import { PersonalProgramActions } from './personal-program-actions';

describe('Personal program editor handlers', () => {
  let state: PersonalProgramState;
  let days: PersonalProgramDays;
  let navigation: PersonalProgramNavigation;
  let actions: PersonalProgramActions;
  let api: { save: jasmine.Spy; start: jasmine.Spy };
  let response: Subject<PersonalProgramDetail>;
  const validForm = { invalid: false, control: { markAllAsTouched() {} } } as NgForm;

  beforeEach(() => {
    state = new PersonalProgramState(false, 'hu');
    state.id = 9;
    state.model = { ...state.model, name: 'Program', expectedVersion: 1, workouts: [{
      dayIndex: 1, name: 'Day', description: null,
      exercises: [{ exerciseId: 1, sets: 3, repetitions: 10, restSeconds: 60, notes: null }],
    }] };
    days = new PersonalProgramDays(state);
    navigation = new PersonalProgramNavigation(state);
    response = new Subject<PersonalProgramDetail>();
    api = { save: jasmine.createSpy().and.returnValue(response), start: jasmine.createSpy() };
    TestBed.configureTestingModule({});
    const destroyRef = TestBed.runInInjectionContext(() => inject(DestroyRef));
    actions = new PersonalProgramActions(state, days, navigation, api as never, { navigate: jasmine.createSpy() } as never, destroyRef);
  });

  it('resolves every pending leave observer on cancellation and permits a fresh confirmation', () => {
    state.dirty = true;
    const first = navigation.canLeave();
    const second = navigation.canLeave();
    const decisions: boolean[] = [];
    if (typeof first !== 'boolean') first.subscribe(value => decisions.push(value));
    if (typeof second !== 'boolean') second.subscribe(value => decisions.push(value));
    navigation.cancel();
    expect(decisions).toEqual([false, false]);
    expect(state.dirty).toBeTrue();
    const next = navigation.canLeave();
    if (typeof next !== 'boolean') next.subscribe(value => decisions.push(value));
    actions.confirm();
    expect(decisions).toEqual([false, false, true]);
    expect(state.dirty).toBeFalse();
    expect(state.action).toBeNull();
  });

  it('resolves a pending leave request as rejected when the editor is destroyed', () => {
    state.dirty = true;
    const result = navigation.canLeave();
    const next = jasmine.createSpy('next');
    const complete = jasmine.createSpy('complete');
    if (typeof result !== 'boolean') result.subscribe({ next, complete });
    navigation.destroy();
    expect(next).toHaveBeenCalledOnceWith(false);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(state.dirty).toBeTrue();
  });

  it('blocks leaving and cancellation while a save is active', () => {
    state.dirty = true;
    actions.save(validForm);
    expect(state.busy).toBeTrue();
    expect(navigation.canLeave()).toBeFalse();
    navigation.cancel();
    expect(state.busy).toBeTrue();
    response.error(new Error('offline'));
    expect(state.busy).toBeFalse();
    expect(state.dirty).toBeTrue();
    expect(state.model.name).toBe('Program');
  });

  it('protects browser unload for both dirty data and active operations', () => {
    for (const [dirty, busy] of [[true, false], [false, true]]) {
      state.dirty = dirty; state.busy = busy;
      const event = { preventDefault: jasmine.createSpy(), returnValue: 'before' };
      navigation.beforeUnload(event as unknown as BeforeUnloadEvent);
      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(event.returnValue).toBe('');
    }
  });

  it('removes the selected picker day and marks the shared form as dirty', () => {
    const day = state.model.workouts[0];
    days.pickerDay = day;
    days.removeDay(day);
    expect(days.pickerDay).toBeNull();
    expect(state.model.workouts).toEqual([]);
    expect(state.dirty).toBeTrue();
  });

  it('rejects exercise additions at the day limit without changing names or dirty state', () => {
    const day = state.model.workouts[0];
    day.exercises = Array.from({ length: 100 }, (_, i) => ({ ...day.exercises[0], exerciseId: i + 1 }));
    days.pickerDay = day;
    days.addExercise({ id: 101, name: 'Extra', muscleGroup: null, equipment: null });
    expect(day.exercises.length).toBe(100);
    expect(days.names[101]).toBeUndefined();
    expect(state.dirty).toBeFalse();
  });

  it('does not send an invalid form and marks its controls touched', () => {
    const touched = jasmine.createSpy('touched');
    actions.save({ invalid: true, control: { markAllAsTouched: touched } } as unknown as NgForm);
    expect(touched).toHaveBeenCalledTimes(1);
    expect(api.save).not.toHaveBeenCalled();
  });

  it('sends the normalized standalone request while retaining the visible draft until confirmation', () => {
    state.standaloneMode = true;
    state.model.name = 'Standalone';
    state.model.description = 'Description';
    state.model.workouts[0].dayIndex = 3;
    actions.save(validForm);
    expect(api.save).toHaveBeenCalledOnceWith(9, jasmine.objectContaining({
      name: 'Standalone', durationDays: 1, startDate: null, difficultyLevel: null,
      workouts: [jasmine.objectContaining({ dayIndex: 1, name: 'Standalone', description: 'Description' })],
    }), true);
    expect(state.model.workouts[0].dayIndex).toBe(3);
    expect(state.model.workouts[0].name).toBe('Day');
    response.next({ id: 9, standalone: true, startedAt: null, program: { ...state.model, expectedVersion: 2 } });
    expect(state.model.expectedVersion).toBe(2);
  });
});
