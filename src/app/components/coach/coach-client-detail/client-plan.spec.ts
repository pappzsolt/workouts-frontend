import { buildWeeks, type ClientWorkoutEntry } from './client-plan';

const workout = (date: string | null): ClientWorkoutEntry => ({
  userWorkoutId: 1, workoutId: 1, name: 'Workout', date, dayIndex: 1,
  completed: false, startedAt: null, feedback: null, exercises: [], setsTotal: 0, setsCompleted: 0,
});

describe('Client program seven-day weeks', () => {
  for (const [start, dates] of [
    ['2026-03-23', ['2026-03-23', '2026-03-30', '2026-04-06']],
    ['2026-10-19', ['2026-10-19', '2026-10-26', '2026-11-02']],
    ['2026-12-28', ['2026-12-28', '2027-01-04', '2027-01-11']],
    ['2026-08-01', ['2026-08-01', '2026-08-08', '2026-08-15']],
    ['2026-03-24', ['2026-03-24', '2026-03-31', '2026-04-07']],
  ] as const) {
    it(`counts consecutive seven-day program weeks from ${start}`, () => {
      const weeks = buildWeeks(dates.map(workout), start);
      expect(weeks.map(week => week.label)).toEqual(['1', '2', '3']);
      expect(weeks.map(week => week.from)).toEqual([...dates]);
      expect(weeks.map(week => week.to)).toEqual(
        dates.map(date => {
          const d = new Date(`${date}T12:00:00`);
          d.setDate(d.getDate() + 6);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }),
      );
    });
  }

  it('keeps workouts in the first program week across a calendar-week boundary', () => {
    const weeks = buildWeeks(
      ['2026-08-01', '2026-08-04', '2026-08-07', '2026-08-08'].map(workout),
      '2026-08-01',
    );
    expect(weeks.map(week => week.label)).toEqual(['1', '2']);
    expect(weeks[0].from).toBe('2026-08-01');
    expect(weeks[0].to).toBe('2026-08-07');
    expect(weeks[0].workouts.map(w => w.date)).toEqual(['2026-08-01', '2026-08-04', '2026-08-07']);
    expect(weeks[1].from).toBe('2026-08-08');
  });

  it('ignores workouts without a date and uses the earliest scheduled date when the start is missing', () => {
    const weeks = buildWeeks([workout('2026-03-29'), workout(null), workout('2026-03-25')], null);
    expect(weeks.length).toBe(1);
    expect(weeks[0].label).toBe('1');
    expect(weeks[0].from).toBe('2026-03-25');
    expect(weeks[0].to).toBe('2026-03-31');
    expect(weeks[0].workouts.length).toBe(2);
    expect(buildWeeks([workout(null)], null)).toEqual([]);
  });

  it('sorts week groups chronologically even when workouts arrive out of order', () => {
    const weeks = buildWeeks([workout('2026-08-16'), workout('2026-08-04'), workout('2026-08-09')], '2026-08-01');
    expect(weeks.map(week => week.label)).toEqual(['1', '2', '3']);
    expect(weeks.map(week => week.from)).toEqual(['2026-08-01', '2026-08-08', '2026-08-15']);
  });

  it('uses week zero for a workout within seven days before the program start, like the backend', () => {
    const weeks = buildWeeks([workout('2026-07-31'), workout('2026-08-01')], '2026-08-01');
    expect(weeks.map(week => week.label)).toEqual(['0', '1']);
    expect(weeks.map(week => week.from)).toEqual(['2026-07-25', '2026-08-01']);
  });
});
