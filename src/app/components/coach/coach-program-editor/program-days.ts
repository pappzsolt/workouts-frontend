import { addDays, fromIsoDate, toIsoDate } from '../../../shared/local-date';
import type {
  CoachClientOverview,
  CoachProgram,
  CoachProgramDayLink,
  CoachProgramWorkout,
} from '../../../models/coach-workspace.model';

/** A program egy napja a rácsban. */
export interface DayCell {
  day: number;
  date: Date | null;
  workout: CoachProgramWorkout | null;
  link: CoachProgramDayLink | null;
  label: string;
}

/** A kiválasztott nap edzésének egy gyakorlata, szerkeszthető előírt értékekkel. */
export interface EditableExercise {
  id: number;
  name: string;
  sets: number;
  repetitions: number;
  restSeconds: number;
  original: { sets: number; repetitions: number; restSeconds: number };
}

/**
 * A program napjai (1-től az időtartamig) a hozzájuk tartozó edzéssel, és a rács elején
 * a kezdőnap előtti üres helyek (a rács hétfővel kezdődik).
 */
export function buildDayCells(
  program: CoachProgram | null,
  links: CoachProgramDayLink[],
  durationDays: number | string,
  startDate: string,
): { cells: DayCell[]; leadingBlanks: number[] } {
  const workoutsByLinkId = new Map<number, CoachProgramWorkout>();
  const workoutsById = new Map<number, CoachProgramWorkout>();
  for (const workout of program?.workouts ?? []) {
    workoutsByLinkId.set(workout.programWorkoutId, workout);
    if (!workoutsById.has(workout.workoutId)) workoutsById.set(workout.workoutId, workout);
  }
  const byDay = new Map<number, CoachProgramDayLink>();
  for (const link of links) byDay.set(link.dayIndex, link);

  const duration = Math.max(1, Number(durationDays) || 1);
  const start = startDate ? fromIsoDate(startDate) : null;
  const prefix = commonPrefix((program?.workouts ?? []).map((workout) => workout.name));
  const cells = Array.from({ length: duration }, (_, index) => {
    const day = index + 1;
    const link = byDay.get(day) ?? null;
    const workout = link ? workoutsByLinkId.get(link.id) ?? workoutsById.get(link.workoutId) ?? null : null;
    return { day, date: start ? addDays(start, index) : null, workout, link, label: workout ? shortName(workout.name, prefix) : '' };
  });
  const offset = start ? (start.getDay() + 6) % 7 : 0;
  return { cells, leadingBlanks: Array.from({ length: offset }, (_, i) => i) };
}

export function dayAriaLabel(cell: DayCell): string {
  return cell.workout ? `${cell.day}: ${cell.workout.name}` : `${cell.day}`;
}

/** A programnap dátuma (YYYY-MM-DD). */
export function dateForDay(startDate: string, day: number): string {
  return toIsoDate(addDays(fromIsoDate(startDate), day - 1));
}

/**
 * A dátumhoz tartozó programnap (day_index, 1-től): a kezdőnaptól eltelt napok + 1.
 * Üres vagy hibás dátumnál NaN. Naptári napokat számol, így az óraátállítás nem zavarja.
 */
export function dayForDate(startDate: string, value: string): number {
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return NaN;
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [y, m, d] = value.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(sy, sm - 1, sd)) / 86_400_000) + 1;
}

export function isPrescriptionChanged(row: EditableExercise): boolean {
  return (
    Number(row.sets) !== row.original.sets ||
    Number(row.repetitions) !== row.original.repetitions ||
    Number(row.restSeconds) !== row.original.restSeconds
  );
}

/** A nap után hetente ugyanarra a hétnapra eső napok: a még üresek és a kimaradók száma. */
export function weeklyRepeat(cells: DayCell[], selectedDay: number): { days: number[]; skipped: number } {
  const days: number[] = [];
  let skipped = 0;
  for (let day = selectedDay + 7; day <= cells.length; day += 7) {
    if (cells[day - 1]?.link) skipped++;
    else days.push(day);
  }
  return { days, skipped };
}

/** A kiválasztott naptól kezdve a következő szabad napok, legfeljebb a megadott számban. */
export function freeDaysFrom(cells: DayCell[], selectedDay: number, count: number): number[] {
  const days: number[] = [];
  for (const cell of cells) {
    if (days.length === count) break;
    if (cell.day >= selectedDay && !cell.link) days.push(cell.day);
  }
  return days;
}

/** Monogram a névből (pl. "coach_user01" → "CU", "Andi" → "AN"). */
export function clientInitials(client: CoachClientOverview): string {
  const parts = (client.username ?? '').trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toLocaleUpperCase();
  return (parts[0] ?? '?').slice(0, 2).toLocaleUpperCase();
}

/** Az edzésnevek közös eleje (szóhatárig), pl. "workouts-Workout-". */
function commonPrefix(names: string[]): string {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length < 2) return '';
  let prefix = unique[0];
  for (const name of unique.slice(1)) {
    while (prefix && !name.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  const cut = Math.max(prefix.lastIndexOf(' '), prefix.lastIndexOf('-'), prefix.lastIndexOf('_'));
  return cut >= 0 ? prefix.slice(0, cut + 1) : '';
}

/** A rácsban a név közös előtag nélküli része, hogy a lényeg látsszon. */
function shortName(name: string, prefix: string): string {
  const rest = prefix && name.startsWith(prefix) ? name.slice(prefix.length).trim() : name;
  return rest || name;
}
