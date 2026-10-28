import { addDays, fromIsoDate, startOfWeek, toIsoDate } from './local-date';

describe('Local calendar dates', () => {
  it('formats and parses local calendar dates without converting to UTC', () => {
    const date = new Date(2026, 0, 2, 0, 15);
    expect(toIsoDate(date)).toBe('2026-01-02');
    const parsed = fromIsoDate('2026-01-02');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(0);
    expect(parsed.getDate()).toBe(2);
    expect(parsed.getHours()).toBe(0);
  });

  it('adds calendar days across month and year boundaries without mutating the input', () => {
    const original = new Date(2026, 11, 31, 15, 30);
    expect(toIsoDate(addDays(original, 1))).toBe('2027-01-01');
    expect(toIsoDate(addDays(original, -31))).toBe('2026-11-30');
    expect(original.getHours()).toBe(15);
    expect(toIsoDate(original)).toBe('2026-12-31');
    expect(addDays(original, 0).getHours()).toBe(0);
  });

  it('steps over daylight saving transition dates as calendar days', () => {
    expect(toIsoDate(addDays(fromIsoDate('2026-03-28'), 2))).toBe('2026-03-30');
    expect(toIsoDate(addDays(fromIsoDate('2026-10-24'), 2))).toBe('2026-10-26');
  });

  it('uses Monday as week start, including Sundays and year boundaries', () => {
    expect(toIsoDate(startOfWeek(fromIsoDate('2026-10-26')))).toBe('2026-10-26');
    expect(toIsoDate(startOfWeek(fromIsoDate('2026-11-01')))).toBe('2026-10-26');
    expect(toIsoDate(startOfWeek(fromIsoDate('2027-01-01')))).toBe('2026-12-28');
  });
});
