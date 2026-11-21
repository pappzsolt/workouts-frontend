import { PersonalProgramState } from './personal-program-state';
import { PersonalProgramDays } from './personal-program-days';

describe('Started personal program calendar rescheduling', () => {
  it('maps a moved execution to its real calendar date without changing the immutable day index', () => {
    const state = new PersonalProgramState(false, 'hu');
    state.started = true;
    state.model = {
      name: 'Erőemelő terv', description: null, durationDays: 14, startDate: '2030-01-01',
      languageCode: 'hu', difficultyLevel: null,
      workouts: [
        { dayIndex: 3, name: 'Guggolás', description: null, exercises: [] },
        { dayIndex: 5, name: 'Fekvenyomás', description: null, exercises: [] },
      ],
    };
    const days = new PersonalProgramDays(state);
    days.schedules = [
      { dayIndex: 3, scheduledAt: '2030-01-04', version: 2, editable: true },
      { dayIndex: 5, scheduledAt: '2030-01-05', version: 1, editable: false },
    ];
    expect(days.cells[2].workout).toBeNull();
    expect(days.cells[3].workout?.name).toBe('Guggolás');
    expect(days.cells[4].workout?.name).toBe('Fekvenyomás');
    days.selectDay(4);
    expect(days.visibleDays[0].dayIndex).toBe(3);
    expect(days.freeDays).not.toContain(4);
    expect(days.freeDays).toContain(3);
    expect(state.model.workouts[0].dayIndex).toBe(3);
  });

  it('indexes a dense year once without nested workout or schedule searches', () => {
    const state = new PersonalProgramState(false, 'hu');
    state.started = true;
    state.model.startDate = '2030-01-01';
    state.model.durationDays = 366;
    state.model.workouts = Array.from({ length: 366 }, (_, index) => ({
      dayIndex: index + 1, name: `Edzés ${index + 1}`, description: null, exercises: [],
    }));
    const days = new PersonalProgramDays(state);
    days.schedules = state.model.workouts.map(day => ({
      dayIndex: day.dayIndex, scheduledAt: '2030-01-01', version: 1, editable: true,
    }));
    const scheduleFind = spyOn(days.schedules, 'find').and.callThrough();
    const workoutFind = spyOn(state.model.workouts, 'find').and.callThrough();
    // Every moved workout points to the first date; the original first match wins.
    const cells = days.cells;
    expect(cells.length).toBe(366);
    expect(cells[0].workout?.name).toBe('Edzés 1');
    expect(cells[1].workout).toBeNull();
    expect(scheduleFind).not.toHaveBeenCalled();
    expect(workoutFind).not.toHaveBeenCalled();
  });

  it('preserves moved dates, out-of-range fallback and in-place draft edits', () => {
    const state = new PersonalProgramState(false, 'hu');
    state.started = true;
    state.model.startDate = '2030-01-01';
    state.model.durationDays = 7;
    state.model.workouts = [
      { dayIndex: 1, name: 'A', description: null, exercises: [] },
      { dayIndex: 2, name: 'B', description: null, exercises: [] },
      { dayIndex: 3, name: 'C', description: null, exercises: [] },
    ];
    const days = new PersonalProgramDays(state);
    days.schedules = [
      { dayIndex: 1, scheduledAt: '2030-01-04', version: 1, editable: true },
      { dayIndex: 2, scheduledAt: '2031-01-01', version: 1, editable: true },
      { dayIndex: 3, scheduledAt: '2030-01-04', version: 1, editable: true },
    ];
    let cells = days.cells;
    expect(cells[3].workout?.name).toBe('A'); // first workout for an occupied date
    expect(cells[1].workout?.name).toBe('B'); // out-of-range schedule falls back
    expect(cells[2].workout).toBeNull();
    state.model.workouts[0].name = 'Changed draft';
    state.changed();
    cells = days.cells;
    expect(cells[3].workout?.name).toBe('Changed draft');
    days.schedules = [{ dayIndex: 1, scheduledAt: '2030-01-05', version: 2, editable: true }];
    expect(days.cells[4].workout?.name).toBe('Changed draft');
  });

});
