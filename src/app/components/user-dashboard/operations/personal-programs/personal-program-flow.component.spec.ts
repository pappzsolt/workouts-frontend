import { TestBed } from '@angular/core/testing';
import { PersonalProgramService } from '../../../../services/user/personal-program.service';
import { NgForm } from '@angular/forms';
import { of, Subject, throwError } from 'rxjs';
import type { PersonalDayTargets, PersonalWorkoutSchedule } from '../../../../models/personal-program.model';
import { PersonalProgramDays } from './personal-program-days';
import { PersonalProgramFlowComponent } from './personal-program-flow.component';
import { PersonalProgramState } from './personal-program-state';

/** UI-only regression: switching screens must not mutate the shared draft. */
describe('Personal multi-day program flow', () => {
  let flow: PersonalProgramFlowComponent;
  let state: PersonalProgramState;
  let days: PersonalProgramDays;
  let service: jasmine.SpyObj<PersonalProgramService>;
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
    service = jasmine.createSpyObj<PersonalProgramService>('PersonalProgramService', ['schedule', 'moveDay', 'dayTargets', 'updateDayTargets']);
    TestBed.configureTestingModule({ providers: [{ provide: PersonalProgramService, useValue: service }] });
    flow = TestBed.runInInjectionContext(() => new PersonalProgramFlowComponent());
    flow.state = state;
    flow.days = days;
    flow.actions = { save: jasmine.createSpy('save') } as never;
  });

  it('keeps the newest schedule when an older read finishes last', () => {
    const first = new Subject<PersonalWorkoutSchedule[]>();
    const second = new Subject<PersonalWorkoutSchedule[]>();
    service.schedule.and.returnValues(first.asObservable(), second.asObservable());
    state.started = true;
    state.model.startDate = '2030-01-01';
    flow.scheduleStarted = true;
    flow.scheduleProgramId = 7;

    flow.loadSchedules();
    flow.loadSchedules();
    const newest = [{ dayIndex: 1, scheduledAt: '2030-01-03', version: 2, editable: true }];
    second.next(newest);
    second.complete();
    first.next([{ dayIndex: 1, scheduledAt: '2030-01-01', version: 1, editable: true }]);
    first.complete();

    expect(service.schedule).toHaveBeenCalledTimes(2);
    expect(days.schedules).toEqual(newest);
    expect(flow.scheduleLoading).toBeFalse();
    expect(flow.scheduleFailed).toBeFalse();
  });

  it('does not restore an old schedule after a successful workout date move', () => {
    const outdated = new Subject<PersonalWorkoutSchedule[]>();
    service.schedule.and.returnValue(outdated.asObservable());
    state.started = true;
    state.model.startDate = '2030-01-01';
    state.model.durationDays = 14;
    flow.scheduleStarted = true;
    flow.scheduleProgramId = 7;
    days.schedules = [{ dayIndex: 1, scheduledAt: '2030-01-01', version: 1, editable: true }];
    days.selectedDay = 1;
    flow.moveDestination = 2;
    const updated = [{ dayIndex: 1, scheduledAt: '2030-01-02', version: 2, editable: true }];
    service.moveDay.and.returnValue(of(updated));

    flow.loadSchedules();
    flow.moveSelectedDay();
    outdated.next([{ dayIndex: 1, scheduledAt: '2030-01-01', version: 1, editable: true }]);
    outdated.complete();

    expect(service.moveDay).toHaveBeenCalledOnceWith(7, 1, '2030-01-02', 1);
    expect(days.schedules).toEqual(updated);
    expect(days.selectedDay).toBe(2);
    expect(flow.scheduleLoading).toBeFalse();
    expect(flow.scheduleFailed).toBeFalse();
  });

  it('waits for a pending workout move before opening that day’s targets', () => {
    const pending = new Subject<PersonalWorkoutSchedule[]>();
    state.id = 7;
    state.started = true;
    state.model.startDate = '2030-01-01';
    flow.scheduleStarted = true;
    flow.scheduleProgramId = 7;
    flow.moveDestination = 2;
    days.schedules = [{ dayIndex: 1, scheduledAt: '2030-01-01', version: 1, editable: true }];
    service.moveDay.and.returnValue(pending);
    service.dayTargets.and.returnValue(new Subject<PersonalDayTargets>());

    flow.moveSelectedDay();
    flow.openDay();
    expect(flow.view).toBe('calendar');
    expect(service.dayTargets).not.toHaveBeenCalled();
    pending.next([{ dayIndex: 1, scheduledAt: '2030-01-02', version: 2, editable: true }]);
    pending.complete();
    flow.openDay();

    expect(flow.view).toBe('day');
    expect(days.selectedDay).toBe(2);
    expect(service.dayTargets).toHaveBeenCalledOnceWith(7, 1);
  });

  it('does not change day or flow step while a workout move is pending', () => {
    const pending = new Subject<PersonalWorkoutSchedule[]>();
    state.id = 7;
    state.started = true;
    state.model.startDate = '2030-01-01';
    state.model.durationDays = 14;
    flow.scheduleStarted = true;
    flow.scheduleProgramId = 7;
    flow.moveDestination = 2;
    days.schedules = [{ dayIndex: 1, scheduledAt: '2030-01-01', version: 1, editable: true }];
    service.moveDay.and.returnValue(pending);
    days.selectedDay = 1;
    flow.view = 'day';

    flow.moveSelectedDay();
    expect(state.busy).toBeTrue();
    flow.selectDay(4);
    flow.backToCalendar();
    flow.backToDay();
    expect(days.selectedDay).toBe(1);
    expect(flow.view).toBe('day');

    pending.next([{ dayIndex: 1, scheduledAt: '2030-01-02', version: 2, editable: true }]);
    pending.complete();
    expect(state.busy).toBeFalse();
    expect(days.selectedDay).toBe(2);
    flow.backToCalendar();
    expect(flow.view).toBe('calendar');
  });

  it('keeps newer target values and version if an earlier load settles last', () => {
    const first = new Subject<PersonalDayTargets>();
    const second = new Subject<PersonalDayTargets>();
    service.dayTargets.and.returnValues(first.asObservable(), second.asObservable());
    state.id = 7;
    state.started = true;
    const targets = (version: number): PersonalDayTargets => ({
      dayIndex: 1, version, editable: true,
      exercises: state.model.workouts[0].exercises.map((exercise, exerciseIndex) => ({
        exerciseIndex, userExerciseId: 100 + exerciseIndex, exerciseId: exercise.exerciseId, editable: true,
        sets: Array.from({ length: exercise.sets }, () => ({
          targetRepetitions: version + 3, targetWeightKg: 50, restSeconds: 60, targetRpe: 8,
        })),
      })),
    });

    flow.openDay();
    flow.openDay();
    second.next(targets(2));
    second.complete();
    first.next(targets(1));
    first.complete();

    expect(service.dayTargets).toHaveBeenCalledTimes(2);
    expect(flow.targetSession?.version).toBe(2);
    expect(flow.targetDay?.exercises[0].setTargets?.[0].targetRepetitions).toBe(5);
    expect(flow.targetLoading).toBeFalse();
  });

  it('handles malformed target indexes and array shapes using the existing load-failure state', () => {
    state.id = 7;
    state.started = true;
    const sets = (count: number) => Array.from({ length: count }, () => ({
      targetRepetitions: 5, targetWeightKg: 50, restSeconds: 60, targetRpe: 8,
    }));
    const valid = [
      { exerciseIndex: 0, userExerciseId: 100, exerciseId: 12, editable: true, sets: sets(3) },
      { exerciseIndex: 1, userExerciseId: 101, exerciseId: 13, editable: true, sets: sets(2) },
    ];
    const invalid: unknown[][] = [
      [{ ...valid[0], exerciseIndex: 0.5 }, valid[1]],
      [{ ...valid[0], exerciseIndex: Number.NaN }, valid[1]],
      [{ ...valid[0], exerciseIndex: -1 }, valid[1]],
      [{ ...valid[0], exerciseIndex: 2 }, valid[1]],
      [valid[0], { ...valid[1], exerciseIndex: 0 }],
      [valid[0], { ...valid[1], userExerciseId: 100 }],
      [valid[0], { ...valid[1], sets: null }],
    ];
    for (const exercises of invalid) {
      service.dayTargets.and.returnValue(of({ dayIndex: 1, version: 1, editable: true, exercises } as unknown as PersonalDayTargets));
      expect(() => flow.openDay()).not.toThrow();
      expect(flow.targetLoading).toBeFalse();
      expect(flow.targetDay).toBeNull();
      expect(flow.targetSession).toBeNull();
      expect(state.message).toBe('personalEditorUi.targetsLoadFailed');
    }
    service.dayTargets.and.returnValue(of({ dayIndex: 1, version: 1, editable: true, exercises: null } as unknown as PersonalDayTargets));
    expect(() => flow.openDay()).not.toThrow();
    expect(state.message).toBe('personalEditorUi.targetsLoadFailed');
  });

  it('rejects non-sequential execution order instead of applying targets to the wrong exercise', () => {
    state.id = 7;
    state.started = true;
    const set = { targetRepetitions: 8, targetWeightKg: 42, restSeconds: 60, targetRpe: 7 };
    service.dayTargets.and.returnValue(of({
      dayIndex: 1, version: 3, editable: true,
      exercises: [
        { exerciseIndex: 1, userExerciseId: 101, exerciseId: 13, editable: true, sets: [set] },
        { exerciseIndex: 0, userExerciseId: 100, exerciseId: 12, editable: true, sets: [set] },
      ],
    }));
    flow.openDay();
    expect(flow.targetDay).toBeNull();
    expect(state.message).toBe('personalEditorUi.targetsLoadFailed');
  });

  it('adds and removes future exercises but leaves a completed exercise and the blueprint untouched', () => {
    state.id = 7;
    state.started = true;
    const blueprint = structuredClone(state.model.workouts);
    const base: PersonalDayTargets = {
      dayIndex: 1, version: 2, editable: true,
      exercises: [
        { exerciseIndex: 0, userExerciseId: 100, exerciseId: 12, editable: false,
          sets: [{ targetRepetitions: 5, targetWeightKg: 90, restSeconds: 120, targetRpe: 8 }] },
        { exerciseIndex: 1, userExerciseId: 101, exerciseId: 13, editable: true,
          sets: [{ targetRepetitions: 8, targetWeightKg: 30, restSeconds: 60, targetRpe: 7 }] },
      ],
    };
    service.dayTargets.and.returnValue(of(base));
    flow.openDay();
    expect(flow.targetDay?.exercises[0].executionEditable).toBeFalse();
    flow.removeStartedExercise(0);
    expect(flow.targetDay?.exercises.length).toBe(2);
    flow.removeStartedExercise(1);
    expect(flow.targetDay?.exercises.length).toBe(1);
    flow.addStartedExercise({ id: 14, name: 'Új gyakorlat' } as never);
    expect(flow.targetDay?.exercises.map(row => row.exerciseId)).toEqual([12, 14]);
    expect(flow.targetDay?.exercises[1].sets).toBe(3);
    expect(state.model.workouts).toEqual(blueprint);

    const saved: PersonalDayTargets = { dayIndex: 1, version: 3, editable: true,
      exercises: [base.exercises[0], {
        exerciseIndex: 1, userExerciseId: 102, exerciseId: 14, editable: true,
        sets: Array.from({ length: 3 }, () => ({ targetRepetitions: 10,
          targetWeightKg: null, restSeconds: 60, targetRpe: null })),
      }],
    };
    service.updateDayTargets.and.returnValue(of(saved));
    flow.saveTargets();
    const submitted = service.updateDayTargets.calls.mostRecent().args[2];
    expect(submitted.exercises.map(item => item.exerciseId)).toEqual([12, 14]);
    expect(submitted.exercises[0].userExerciseId).toBe(100);
    expect(submitted.exercises[1].userExerciseId).toBeNull();
    expect(flow.targetDay?.exercises[1].userExerciseId).toBe(102);
    expect(state.model.workouts).toEqual(blueprint);
    expect(state.executionTargetsDirty).toBeFalse();
  });

  it('loads a different live set count without mutating the started program template', () => {
    state.id = 7;
    state.started = true;
    const original = structuredClone(state.model.workouts);
    const result: PersonalDayTargets = {
      dayIndex: 1, version: 3, editable: true,
      exercises: [
        { exerciseIndex: 0, userExerciseId: 100, exerciseId: 12, editable: true, sets: Array.from({ length: 4 }, () => ({
          targetRepetitions: 3, targetWeightKg: 75, restSeconds: 180, targetRpe: 8,
        })) },
        { exerciseIndex: 1, userExerciseId: 101, exerciseId: 13, editable: true, sets: Array.from({ length: 2 }, () => ({
          targetRepetitions: 8, targetWeightKg: 40, restSeconds: 90, targetRpe: 7,
        })) },
      ],
    };
    service.dayTargets.and.returnValue(of(result));
    service.updateDayTargets.and.returnValue(of({ ...result, version: 4, exercises: [
      { ...result.exercises[0], sets: result.exercises[0].sets.slice(0, 3) }, result.exercises[1],
    ] }));

    flow.openDay();
    expect(flow.targetSession?.version).toBe(3);
    expect(flow.targetDay?.exercises[0].sets).toBe(4);
    expect(flow.targetDay?.exercises[0].setTargets?.length).toBe(4);
    expect(flow.targetDay?.exercises[0].repetitions).toBe(3);
    expect(state.model.workouts).toEqual(original);

    const execution = flow.targetDay!.exercises[0];
    execution.setTargets!.splice(2, 1);
    execution.sets = execution.setTargets!.length;
    flow.targetChanged();
    flow.saveTargets();

    const [, , payload] = service.updateDayTargets.calls.mostRecent().args;
    expect(payload.expectedVersion).toBe(3);
    expect(payload.exercises[0].sets.length).toBe(3);
    expect(payload.exercises[1].sets.length).toBe(2);
    expect(state.model.workouts).toEqual(original);
    expect(state.executionTargetsDirty).toBeFalse();
  });

  it('submits retained set identities and reuses server-issued IDs on the next save', () => {
    state.id = 7;
    state.started = true;
    const original: PersonalDayTargets = {
      dayIndex: 1, version: 3, editable: true,
      exercises: [{ exerciseIndex: 0, userExerciseId: 100, exerciseId: 12, editable: true,
        sets: [41, 42, 43].map(userWorkoutSetId => ({
          userWorkoutSetId, targetRepetitions: 5, targetWeightKg: null, restSeconds: 60, targetRpe: null,
        })),
      }],
    };
    service.dayTargets.and.returnValue(of(original));
    flow.openDay();
    const exercise = flow.targetDay!.exercises[0];
    exercise.setTargets!.splice(1, 1);
    exercise.setTargets!.push({ targetRepetitions: 8, targetWeightKg: null, restSeconds: 60,
      targetRpe: null, notes: null });
    exercise.sets = 3;
    flow.targetChanged();
    const saved = { ...original, version: 4, exercises: [{ ...original.exercises[0],
      sets: [original.exercises[0].sets[0], original.exercises[0].sets[2],
        { ...original.exercises[0].sets[2], userWorkoutSetId: 44, targetRepetitions: 8 }],
    }] };
    service.updateDayTargets.and.returnValue(of(saved));
    flow.saveTargets();
    const submitted = service.updateDayTargets.calls.mostRecent().args[2];
    expect(submitted.useSetIds).toBeTrue();
    expect(submitted.exercises[0].sets.map(set => set.userWorkoutSetId)).toEqual([41, 43, undefined]);
    expect(exercise.setTargets!.map(set => set.userWorkoutSetId)).toEqual([41, 43, 44]);
    expect(state.executionTargetsDirty).toBeFalse();
    flow.targetChanged();
    flow.saveTargets();
    const next = service.updateDayTargets.calls.mostRecent().args[2];
    expect(next.expectedVersion).toBe(4);
    expect(next.exercises[0].sets.map(set => set.userWorkoutSetId)).toEqual([41, 43, 44]);
  });

  it('keeps the live edit dirty if the server silently returns the old set count', () => {
    state.id = 7;
    state.started = true;
    const original: PersonalDayTargets = {
      dayIndex: 1, version: 3, editable: true,
      exercises: state.model.workouts[0].exercises.map((exercise, exerciseIndex) => ({
        exerciseIndex, userExerciseId: 100 + exerciseIndex, exerciseId: exercise.exerciseId, editable: true,
        sets: Array.from({ length: exercise.sets }, () => ({
          targetRepetitions: exercise.repetitions, targetWeightKg: null,
          restSeconds: exercise.restSeconds, targetRpe: null,
        })),
      })),
    };
    service.dayTargets.and.returnValue(of(original));
    service.updateDayTargets.and.returnValue(of({ ...original, version: 4 }));
    flow.openDay();
    const execution = flow.targetDay!.exercises[0];
    execution.setTargets!.push({ ...execution.setTargets![2] });
    execution.sets = execution.setTargets!.length;
    flow.targetChanged();
    flow.saveTargets();

    expect(state.executionTargetsDirty).toBeTrue();
    expect(flow.targetSession?.version).toBe(3);
    expect(state.message).toBe('personalEditorUi.targetsSaveMismatch');
    expect(state.messageType).toBe('error');
    expect(flow.targetDay?.exercises[0].sets).toBe(4);
    expect(state.model.workouts[0].exercises[0].sets).toBe(3);
  });

  it('rejects empty or over-limit set counts in the execution target response', () => {
    state.id = 7;
    state.started = true;
    service.dayTargets.and.returnValue(of({
      dayIndex: 1, version: 3, editable: true,
      exercises: [
        { exerciseIndex: 0, userExerciseId: 100, exerciseId: 12, editable: true, sets: [] },
        { exerciseIndex: 1, userExerciseId: 101, exerciseId: 13, editable: true, sets: [{ targetRepetitions: 8, targetWeightKg: null,
          restSeconds: 90, targetRpe: null }] },
      ],
    }));
    flow.openDay();
    expect(flow.targetDay).toBeNull();
    expect(flow.targetSession).toBeNull();
    expect(state.message).toBe('personalEditorUi.targetsLoadFailed');
  });

  it('keeps execution target edits through a failed save and day navigation, independently of the template', () => {
    state.id = 7;
    state.started = true;
    const targets: PersonalDayTargets = {
      dayIndex: 1, version: 3, editable: true,
      exercises: state.model.workouts[0].exercises.map((exercise, exerciseIndex) => ({
        exerciseIndex, userExerciseId: 100 + exerciseIndex, exerciseId: exercise.exerciseId, editable: true,
        sets: Array.from({ length: exercise.sets }, () => ({
          targetRepetitions: 5, targetWeightKg: null, restSeconds: 60, targetRpe: null,
        })),
      })),
    };
    service.dayTargets.and.returnValue(of(targets));
    service.updateDayTargets.and.returnValues(
      throwError(() => new Error('save failed')),
      of({ ...targets, version: 4 }),
    );

    flow.openDay();
    flow.openExercise(0);
    const target = flow.targetDay!.exercises[0].setTargets![0];
    target.targetWeightKg = 42;
    flow.targetChanged();
    expect(state.hasUnsavedChanges).toBeTrue();
    expect(state.dirty).toBeFalse();

    flow.saveTargets();
    expect(state.executionTargetsDirty).toBeTrue();
    expect(flow.targetSession?.version).toBe(3);
    flow.openDay();
    expect(service.dayTargets).toHaveBeenCalledTimes(1);
    expect(flow.targetDay?.exercises[0].setTargets?.[0].targetWeightKg).toBe(42);
    flow.backToCalendar();
    expect(flow.view).toBe('day');

    state.dirty = true;
    flow.saveTargets();
    const request = service.updateDayTargets.calls.mostRecent().args;
    expect(request[2].expectedVersion).toBe(3);
    expect(request[2].exercises[0].sets[0].targetWeightKg).toBe(42);
    expect(flow.targetSession?.version).toBe(4);
    expect(state.executionTargetsDirty).toBeFalse();
    expect(state.hasUnsavedChanges).toBeTrue();
    expect(state.model.workouts[0].exercises[0].setTargets).toBeUndefined();

    flow.targetChanged();
    flow.discardTargets();
    expect(state.executionTargetsDirty).toBeFalse();
    expect(state.dirty).toBeTrue();
    flow.backToCalendar();
    expect(flow.view).toBe('calendar');
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
