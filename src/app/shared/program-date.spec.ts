import { programDayDate, programDayIndex, programEndDate } from './program-date';

describe('Personal program calendar dates', () => {
  it('includes the start day in the program duration across a year boundary', () => {
    expect(programEndDate('2026-11-18', 50)).toBe('2027-01-06');
    expect(programDayDate('2026-11-18', 1)).toBe('2026-11-18');
    expect(programDayDate('2026-11-18', 50)).toBe('2027-01-06');
  });

  it('uses calendar days through daylight saving changes', () => {
    expect(programDayDate('2026-03-28', 4)).toBe('2026-03-31');
    expect(programDayIndex('2026-03-28', '2026-03-31')).toBe(4);
    expect(programEndDate('2024-02-28', 3)).toBe('2024-03-01');
  });

  it('does not fabricate dates when start date or duration is missing or invalid', () => {
    expect(programEndDate(null, 50)).toBeNull();
    expect(programEndDate('2026-11-18', 0)).toBeNull();
    expect(programEndDate('2026-11-18', 367)).toBeNull();
    expect(programEndDate('2026-02-30', 7)).toBeNull();
    expect(programDayIndex(null, '2026-11-18')).toBeNull();
    expect(programDayIndex('2026-11-18', 'not-a-date')).toBeNull();
  });
});
