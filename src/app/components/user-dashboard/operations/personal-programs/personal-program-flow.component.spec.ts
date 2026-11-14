import { NgForm } from '@angular/forms';
import { PersonalProgramDays } from './personal-program-days';
import { PersonalProgramFlowComponent } from './personal-program-flow.component';
import { PersonalProgramState } from './personal-program-state';

/** UI-only regression: switching screens must not mutate the shared draft. */
describe('Personal multi-day program flow', () => {
  let flow: PersonalProgramFlowComponent;
  let state: PersonalProgramState;
  let days: PersonalProgramDays;
  beforeEach(() => {
    state = new PersonalProgramState(false, 'hu');
    state.model.name = 'Edzésterv';
    state.model.workouts = [{
      dayIndex: 1, name: 'Guggolás', description: null,
      exercises: [
        { exerciseId: 12, sets: 3, repetitions: 5, restSeconds: 60, notes: null },
        { exerciseId: 13, sets: 2, repetitions: 8, restSeconds: 90, notes: null },
      ],
    }];
    days = new PersonalProgramDays(state);
    flow = new PersonalProgramFlowComponent();
    flow.state = state;
    flow.days = days;
    flow.actions = { save: jasmine.createSpy('save') } as never;
  });

  it('navigates calendar → day → exercise → day → calendar without changing draft or dirty state', () => {
    const original = structuredClone(state.model);
    flow.openDay();
    flow.openExercise(0);
    expect(flow.view).toBe('exercise');
    flow.nextExercise(1);
    expect(flow.activeExercise?.exerciseId).toBe(13);
    flow.backToDay();
    flow.backToCalendar();
    expect(flow.view).toBe('calendar');
    expect(state.model).toEqual(original);
    expect(state.dirty).toBeFalse();
  });

  it('uses existing day creation and selects the newly created day', () => {
    flow.selectDay(3);
    flow.createDay();
    expect(flow.view).toBe('day');
    expect(flow.activeDay?.dayIndex).toBe(3);
    expect(state.dirty).toBeTrue();
  });

  it('does not create days once the program has started', () => {
    state.started = true;
    flow.selectDay(2);
    flow.createDay();
    expect(flow.activeDay).toBeNull();
    expect(state.model.workouts.length).toBe(1);
  });

  it('delegates valid saves to the original action without changing the payload', () => {
    const form = { invalid: false } as NgForm;
    flow.save(form);
    expect(flow.actions.save).toHaveBeenCalledOnceWith(form);
  });

  it('marks invalid metadata and returns to the calendar without sending a save', () => {
    const touched = jasmine.createSpy('markAllAsTouched');
    const form = { invalid: true, control: { markAllAsTouched: touched } } as unknown as NgForm;
    state.model.name = '';
    flow.openDay();
    flow.save(form);
    expect(flow.view).toBe('calendar');
    expect(touched).toHaveBeenCalledTimes(1);
    expect(flow.actions.save).not.toHaveBeenCalled();
  });
});
