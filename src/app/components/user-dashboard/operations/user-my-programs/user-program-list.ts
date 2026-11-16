import type { UserProgram } from '../../../../models/program.model';

/**
 * "Programjaim": hide programs whose end date is today or earlier and show the
 * newest start date first. API dates use YYYY-MM-DD (LocalDate), so comparing
 * them as strings avoids UTC and daylight-saving boundary issues.
 *
 * A missing end date does not prove that a program has expired: keep it.
 * A missing start date goes to the end of the sorted list.
 */
export function selectCurrentUserPrograms(programs: readonly UserProgram[], today: string): UserProgram[] {
  const newestFirst = (left?: string | null, right?: string | null): number =>
    (right ?? '').localeCompare(left ?? '');

  return programs
    .filter(program => !program.endDate || program.endDate > today)
    .sort((a, b) => {
      // Without a start date there is nothing meaningful to sort by.
      // Preserve the API's original order for these records (stable sort).
      // This also keeps existing progress/loading behavior for legacy data.
      if (!a.startDate && !b.startDate) return 0;
      return newestFirst(a.startDate, b.startDate)
        || newestFirst(a.assignedAt, b.assignedAt)
        || b.id - a.id;
    });
}
