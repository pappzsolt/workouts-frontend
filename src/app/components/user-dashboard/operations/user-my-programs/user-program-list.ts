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
    .sort((a, b) =>
      newestFirst(a.startDate, b.startDate)
      || newestFirst(a.assignedAt, b.assignedAt)
      || b.id - a.id,
    );
}
