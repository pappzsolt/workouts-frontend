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
});
