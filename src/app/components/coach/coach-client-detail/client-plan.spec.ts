import { buildWeeks, type ClientWorkoutEntry } from './client-plan';

const workout = (date: string): ClientWorkoutEntry => ({
  userWorkoutId: 1, workoutId: 1, name: 'Workout', date, dayIndex: 1,
  completed: false, startedAt: null, feedback: null, exercises: [], setsTotal: 0, setsCompleted: 0,
});

describe('Client program calendar weeks', () => {
  for (const [start, dates] of [
    ['2026-03-23', ['2026-03-23', '2026-03-30', '2026-04-06']],
    ['2026-10-19', ['2026-10-19', '2026-10-26', '2026-11-02']],
    ['2026-12-28', ['2026-12-28', '2027-01-04', '2027-01-11']],
  ] as const) {
    it(`numbers consecutive calendar weeks correctly from ${start}`, () => {
      const weeks = buildWeeks(dates.map(workout), start);
      expect(weeks.map(week => week.label)).toEqual(['1', '2', '3']);
      expect(weeks.map(week => week.from)).toEqual([...dates]);
    });
  }
  it('keeps missing-date filtering and calendar week grouping', () => {
    const weeks = buildWeeks([workout('2026-03-25'), workout('2026-03-29'), { ...workout(''), date: null }], '2026-03-25');
    expect(weeks.length).toBe(1);
    expect(weeks[0].from).toBe('2026-03-23');
    expect(weeks[0].to).toBe('2026-03-29');
    expect(weeks[0].workouts.length).toBe(2);
  });
});
