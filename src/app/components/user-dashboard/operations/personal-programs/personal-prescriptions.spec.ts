import { PersonalProgramState } from './personal-program-state';
import { PersonalProgramDays } from './personal-program-days';
import { PersonalExerciseTargetsComponent } from './personal-exercise-targets.component';
import { preparePersonalPrescriptions, validPersonalPrescriptions } from './personal-prescriptions';

describe('Personal program planner and per-set targets', () => {
  function setup() {
    const state = new PersonalProgramState(false, 'hu');
    state.model.durationDays = 21;
    state.model.workouts = [
      {
        dayIndex: 1,
        name: 'Day',
        description: null,
        exercises: [
          { exerciseId: 11, sets: 2, repetitions: 10, restSeconds: 60, notes: 'Legacy note' },
        ],
      },
    ];
    preparePersonalPrescriptions(state.model);
    const targets = new PersonalExerciseTargetsComponent();
    targets.exercise = state.model.workouts[0].exercises[0];
    targets.changed.subscribe(() => state.changed());
    return { state, days: new PersonalProgramDays(state), targets };
  }

  it('expands legacy prescriptions into independent rows without marking a draft dirty', () => {
    const { state, targets } = setup();
    expect(targets.exercise.setTargets).toEqual(
      Array.from({ length: 2 }, () => ({
        targetRepetitions: 10,
        targetWeightKg: null,
        restSeconds: 60,
        targetRpe: null,
        notes: 'Legacy note',
      })),
    );
    targets.exercise.setTargets![0].targetWeightKg = 42.5;
    expect(targets.exercise.setTargets![1].targetWeightKg).toBeNull();
    expect(state.dirty).toBeFalse();
  });

  it('adds, removes and fills rows while synchronizing aggregate fields', () => {
    const { state, targets } = setup();
    Object.assign(targets.exercise.setTargets![0], {
      targetWeightKg: 42.5,
      targetRepetitions: 8,
      targetRpe: 7.5,
    });
    targets.fillDown();
    targets.addSet();
    expect(targets.exercise.sets).toBe(3);
    expect(targets.exercise.repetitions).toBe(8);
    expect(targets.exercise.setTargets!.map((row) => row.targetWeightKg)).toEqual([
      42.5, 42.5, 42.5,
    ]);
    targets.removeSet(1);
    expect(targets.exercise.sets).toBe(2);
    expect(state.dirty).toBeTrue();
    targets.exercise.setTargets![0].targetWeightKg = 50;
    expect(targets.exercise.setTargets![1].targetWeightKg).toBe(42.5);
  });

  it('selects rest days without discarding edits and repeats independent workouts only into empty weeks', () => {
    const { state, days, targets } = setup();
    targets.exercise.setTargets![0].targetWeightKg = 42.5;
    days.repeatWeekly(state.model.workouts[0]);
    expect(state.model.workouts.map((day) => day.dayIndex)).toEqual([1, 8, 15]);
    days.repeatWeekly(state.model.workouts[0]);
    expect(state.model.workouts.length).toBe(3);
    days.selectDay(8);
    expect(days.visibleDays[0].exercises[0].setTargets![0].targetWeightKg).toBe(42.5);
    days.visibleDays[0].exercises[0].setTargets![0].targetWeightKg = 60;
    days.selectDay(1);
    expect(days.visibleDays[0].exercises[0].setTargets![0].targetWeightKg).toBe(42.5);
    days.selectDay(2);
    days.addSelectedDay();
    expect(days.visibleDays[0].dayIndex).toBe(2);
  });

  it('validates every day including targets hidden by the current calendar selection', () => {
    const { state, days, targets } = setup();
    expect(validPersonalPrescriptions(state.model)).toBeTrue();
    targets.exercise.setTargets![1].targetRepetitions = 0;
    days.selectDay(7);
    expect(days.visibleDays).toEqual([]);
    expect(validPersonalPrescriptions(state.model)).toBeFalse();
    targets.exercise.setTargets![1].targetRepetitions = 10;
    targets.exercise.setTargets![1].targetWeightKg = 12.345;
    expect(validPersonalPrescriptions(state.model)).toBeFalse();
    targets.exercise.setTargets![1].targetWeightKg = 12.25;
    targets.exercise.setTargets![1].targetRpe = 7.3;
    expect(validPersonalPrescriptions(state.model)).toBeFalse();
  });

  it('locks row changes and calendar mutations after starting a program', () => {
    const { state, days, targets } = setup();
    state.started = true;
    targets.locked = state.locked;
    targets.addSet();
    targets.removeSet(0);
    targets.fillDown();
    days.repeatWeekly(state.model.workouts[0]);
    expect(targets.exercise.sets).toBe(2);
    expect(state.model.workouts.length).toBe(1);
    expect(state.dirty).toBeFalse();
  });
});
