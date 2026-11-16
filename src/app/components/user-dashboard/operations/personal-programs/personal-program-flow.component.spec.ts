import { TestBed } from '@angular/core/testing';
import { PersonalProgramService } from '../../../../services/user/personal-program.service';
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
    TestBed.configureTestingModule({ providers: [{ provide: PersonalProgramService, useValue: {} }] });
    flow = TestBed.runInInjectionContext(() => new PersonalProgramFlowComponent());
    flow.state = state;
    flow.days = days;
    flow.actions = { save: jasmine.createSpy('save') } as never;
  });

  it('offers free program dates before and after a workout without a today cutoff', () => {
    // An already started program may have past but still empty dates.
    state.started = true;
    state.model.startDate = '2020-01-01';
    state.model.durationDays = 35;
    state.model.workouts[0].dayIndex = 16;
    days.selectedDay = 16;
    days.schedules = [{ dayIndex: 16, scheduledAt: '2020-01-16', version: 1, editable: true }];
    expect(flow.availableMoveDays).toContain(14);
    expect(flow.availableMoveDays).toContain(15);
    expect(flow.availableMoveDays).toContain(17);
    expect(flow.availableMoveDays).not.toContain(16);
    expect(flow.moveContextDate?.getDate()).toBe(16);
  });

  it('shows the actual moved date in a started program without changing the draft', () => {
    state.started = true;
    state.model.startDate = '2026-11-18';
    state.model.durationDays = 50;
    days.schedules = [{ dayIndex: 1, scheduledAt: '2026-11-20', version: 1, editable: true }];
    expect(flow.dayDate(state.model.workouts[0])).toBe('2026-11-20');
    expect(state.model.workouts[0].dayIndex).toBe(1);
    expect(flow.endDate).toBe('2027-01-06');
  });

  it('changes draft workout dates using day indexes without touching other exercises', () => {
    state.model.startDate = '2026-11-18';
    state.model.durationDays = 50;
    const day = state.model.workouts[0];
    const exercises = structuredClone(day.exercises);
    const input = document.createElement('input');
    input.type = 'date';
    input.value = '2026-11-20';
    flow.changeDayDate(day, { target: input } as unknown as Event);
    expect(day.dayIndex).toBe(3);
    expect(days.selectedDay).toBe(3);
    expect(day.exercises).toEqual(exercises);
    expect(state.dirty).toBeTrue();
  });

  it('rejects dates outside the duration or already occupied, without changing the draft', () => {
    state.model.startDate = '2026-11-18';
    state.model.durationDays = 50;
    const day = state.model.workouts[0];
    state.model.workouts.push({ ...structuredClone(day), dayIndex: 2 });
    const input = document.createElement('input');
    input.type = 'date';
    for (const invalid of ['2026-11-19', '2027-01-07', '2026-11-17']) {
      input.value = invalid;
      flow.changeDayDate(day, { target: input } as unknown as Event);
      expect(day.dayIndex).toBe(1);
      expect(input.value).toBe('2026-11-18');
      expect(state.dirty).toBeFalse();
      expect(state.message).toBe('personalEditorUi.dayDateInvalid');
    }
  });

  it('never changes the structure of an already started program via a date input', () => {
    state.started = true;
    state.model.startDate = '2026-11-18';
    const input = document.createElement('input');
    input.type = 'date';
    input.value = '2026-11-20';
    flow.changeDayDate(state.model.workouts[0], { target: input } as unknown as Event);
    expect(state.model.workouts[0].dayIndex).toBe(1);
    expect(state.dirty).toBeFalse();
  });

  it('copies a complete independent week and never replaces occupied days', () => {
    state.model.durationDays = 21;
    state.model.workouts[0].exercises[0].setTargets = [{ targetRepetitions: 6,
      targetWeightKg: 80, restSeconds: 120, targetRpe: 8, notes: 'test' },
      { targetRepetitions: 5, targetWeightKg: 85, restSeconds: 150, targetRpe: 8.5, notes: 'test' },
      { targetRepetitions: 4, targetWeightKg: 90, restSeconds: 180, targetRpe: 9, notes: 'test' }];
    const original = structuredClone(state.model.workouts[0]);
    days.repeatWeekly(state.model.workouts[0]);
    expect(state.model.workouts.map(day => day.dayIndex).sort((a,b)=>a-b)).toEqual([1, 8, 15]);
    expect(state.model.workouts[1].exercises).toEqual(original.exercises);
    state.model.workouts[1].exercises[0].setTargets![0].targetWeightKg = 95;
    expect(state.model.workouts[0].exercises[0].setTargets![0].targetWeightKg).toBe(80);
    days.repeatWeekly(state.model.workouts[0]);
    expect(state.model.workouts.length).toBe(3);
  });

  it('copies a day into an empty chosen day without overwriting', () => {
    state.model.durationDays = 14;
    flow.copyDestination = 5;
    flow.copyToChosenDay(state.model.workouts[0]);
    expect(state.model.workouts.map(day => day.dayIndex)).toEqual([1, 5]);
    flow.copyDestination = 5;
    flow.copyToChosenDay(state.model.workouts[0]);
    expect(state.model.workouts.length).toBe(2);
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
  it('keeps the edited day when its number duplicates another day or is cleared', () => {
    const first = state.model.workouts[0];
    const second = { ...structuredClone(first), dayIndex: 2, name: 'Második nap' };
    state.model.workouts.push(second);
    flow.selectDay(2);
    flow.openDay();
    second.dayIndex = 1;
    days.selectedDay = 1;
    expect(flow.activeDay).toBe(second);
    expect(flow.invalidDays).toEqual([first, second]);
    second.dayIndex = null as unknown as number;
    days.selectedDay = second.dayIndex;
    expect(flow.activeDay).toBe(second);
    second.dayIndex = 3;
    expect(flow.activeDay?.name).toBe('Második nap');
    expect(first.name).toBe('Guggolás');
  });

  it('keeps days outside a shortened program accessible for editing without deleting them', () => {
    const last = { ...structuredClone(state.model.workouts[0]), dayIndex: 7, name: 'Utolsó nap' };
    state.model.workouts.push(last);
    state.model.durationDays = 3;
    expect(flow.invalidDays).toEqual([last]);
    flow.editInvalidDay(last);
    expect(flow.view).toBe('day');
    expect(flow.activeDay).toBe(last);
    last.dayIndex = 3;
    expect(flow.invalidDays).toEqual([]);
    expect(state.model.workouts).toContain(last);
  });

  it('opens the offending exercise when invalid set targets are on another day', () => {
    const invalid = { ...structuredClone(state.model.workouts[0]), dayIndex: 2 };
    invalid.exercises[1].repetitions = 0;
    state.model.workouts.push(invalid);
    flow.save({ invalid: false } as NgForm);
    expect(flow.view).toBe('exercise');
    expect(flow.activeDay).toBe(invalid);
    expect(flow.exerciseIndex).toBe(1);
    expect(state.message).toBe('personalPrograms.invalidTargets');
    expect(flow.actions.save).not.toHaveBeenCalled();
  });

  it('opens an unnamed day instead of its exercise when saving from another screen', () => {
    state.model.workouts[0].name = '';
    flow.save({ invalid: false } as NgForm);
    expect(flow.view).toBe('day');
    expect(flow.activeDay?.name).toBe('');
    expect(flow.actions.save).not.toHaveBeenCalled();
  });

});
