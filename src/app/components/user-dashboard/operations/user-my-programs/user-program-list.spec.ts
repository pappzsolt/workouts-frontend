import { UserProgram } from '../../../../models/program.model';
import { selectCurrentUserPrograms } from './user-program-list';

const program = (
  id: number,
  startDate: string | null,
  endDate: string | null,
  assignedAt: string | null = null,
): UserProgram => ({
  id, name: `Program ${id}`, description: null, startDate, endDate,
  durationWeeks: 4, difficulty: null, status: 'assigned', assignedAt,
});

describe('My programs: dates and ordering', () => {
  const today = '2026-11-16';

  it('hides programs ending today or earlier, but keeps future and undated programs', () => {
    const finished = program(1, '2026-10-13', '2026-11-15');
    const endsToday = program(2, '2026-10-20', today);
    const upcoming = program(3, '2026-11-18', '2027-01-06');
    const undated = program(4, null, null);
    const endedYesterday = program(5, '2026-10-01', '2026-11-15');

    expect(selectCurrentUserPrograms([finished, endsToday, upcoming, undated, endedYesterday], today))
      .toEqual([upcoming, undated]);
  });

  it('sorts newest start dates first and has a deterministic tie breaker', () => {
    const older = program(1, '2026-11-01', '2026-12-01');
    const laterAssigned = program(2, '2026-11-18', '2027-01-06', '2026-11-16T12:00:00');
    const firstAssigned = program(3, '2026-11-18', '2027-01-06', '2026-11-14T12:00:00');
    const sameAssignment = program(4, '2026-11-18', '2027-01-06', '2026-11-16T12:00:00');
    const noStart = program(5, null, null);
    const input = [older, firstAssigned, noStart, laterAssigned, sameAssignment];

    expect(selectCurrentUserPrograms(input, today).map(item => item.id)).toEqual([4, 2, 3, 1, 5]);
    expect(input.map(item => item.id)).toEqual([1, 3, 5, 2, 4]);
  });

  it('does not treat progress or status as expiration', () => {
    const markedCompleted = { ...program(1, '2026-11-01', '2026-11-30'), status: 'completed' };
    expect(selectCurrentUserPrograms([markedCompleted], today)).toEqual([markedCompleted]);
  });

  it('returns an empty list when all programs have ended', () => {
    expect(selectCurrentUserPrograms([
      program(1, '2026-09-01', '2026-09-30'),
      program(2, '2026-10-01', '2026-11-15'),
    ], today)).toEqual([]);
  });
});
