import { buildCalendarMonth } from './calendar-month';

describe('Calendar month generation', () => {
  const today = new Date(2026, 9, 29, 18, 30);
  const key = (date: Date): string =>
    `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

  for (const [year, count] of [[2023, 28], [2024, 29], [1900, 28], [2000, 29], [2100, 28]]) {
    it(`includes ${count} February days in ${year}`, () => {
      const days = buildCalendarMonth(year, 1, today);
      const current = days.filter(day => day.currentMonth);
      expect(current.length).toBe(count);
      expect(current.map(day => day.date.getDate())).toEqual(Array.from({ length: count }, (_, i) => i + 1));
    });
  }

  for (let month = 0; month < 12; month++) {
    it(`starts on Monday and ends on Sunday with consecutive local dates for month ${month + 1}`, () => {
      const days = buildCalendarMonth(2026, month, today);
      expect(days[0].date.getDay()).toBe(1);
      expect(days[days.length - 1].date.getDay()).toBe(0);
      expect(days.length % 7).toBe(0);
      expect(new Set(days.map(day => key(day.date))).size).toBe(days.length);
      days.slice(1).forEach((day, index) => {
        const previous = days[index].date;
        expect(key(day.date)).toBe(key(new Date(previous.getFullYear(), previous.getMonth(), previous.getDate() + 1)));
      });
      expect(days.filter(day => day.currentMonth).length).toBe(new Date(2026, month + 1, 0).getDate());
    });
  }

  it('does not add empty weeks to a Monday-starting 28-day month', () => {
    const days = buildCalendarMonth(2021, 1, today);
    expect(days.length).toBe(28);
    expect(days.every(day => day.currentMonth)).toBeTrue();
  });

  it('includes all six preceding days when the month starts on Sunday', () => {
    const days = buildCalendarMonth(2023, 9, today);
    expect(days.length).toBe(42);
    expect(days.slice(0, 6).every(day => !day.currentMonth)).toBeTrue();
    expect(key(days[0].date)).toBe('2023-9-25');
    expect(key(days[6].date)).toBe('2023-10-1');
  });

  it('pads January with December dates from the preceding year', () => {
    const days = buildCalendarMonth(2026, 0, today);
    expect(key(days[0].date)).toBe('2025-12-29');
    expect(days[0].currentMonth).toBeFalse();
    expect(key(days[days.length - 1].date)).toBe('2026-2-1');
  });

  it('pads December with January dates from the following year', () => {
    const days = buildCalendarMonth(2025, 11, today);
    expect(key(days[days.length - 1].date)).toBe('2026-1-4');
    expect(days[days.length - 1].currentMonth).toBeFalse();
  });

  it('marks today by local calendar date regardless of time of day', () => {
    const days = buildCalendarMonth(2026, 9, today);
    expect(days.filter(day => day.isToday).map(day => key(day.date))).toEqual(['2026-10-29']);
    expect(today.getHours()).toBe(18);
    expect(today.getMinutes()).toBe(30);
  });

  it('can mark today in the preceding-month padding', () => {
    const days = buildCalendarMonth(2026, 0, new Date(2025, 11, 31, 23, 59));
    const marked = days.filter(day => day.isToday);
    expect(marked.length).toBe(1);
    expect(marked[0].currentMonth).toBeFalse();
    expect(key(marked[0].date)).toBe('2025-12-31');
  });

  it('leaves all days unmarked when today is outside the visible range', () => {
    expect(buildCalendarMonth(2024, 1, today).some(day => day.isToday)).toBeFalse();
  });
});
