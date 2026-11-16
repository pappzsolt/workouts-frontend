import { addDays, calendarDaysBetween, fromIsoDate, toIsoDate } from './local-date';

/** Parse a real calendar date without UTC conversion or daylight-saving shifts. */
function validDate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = fromIsoDate(value);
  return Number.isNaN(date.getTime()) || toIsoDate(date) !== value ? null : date;
}

/** Day 1 is the program start date, matching the backend's inclusive end_date. */
export function programDayDate(startDate: string | null | undefined, dayIndex: number): string | null {
  const start = validDate(startDate);
  if (!start || !Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > 366) return null;
  return toIsoDate(addDays(start, dayIndex - 1));
}

export function programEndDate(startDate: string | null | undefined, durationDays: number): string | null {
  return programDayDate(startDate, durationDays);
}

/** Convert a chosen local date back to the existing 1-based dayIndex API contract. */
export function programDayIndex(startDate: string | null | undefined, date: string): number | null {
  const start = validDate(startDate);
  const selected = validDate(date);
  return start && selected ? calendarDaysBetween(start, selected) + 1 : null;
}
