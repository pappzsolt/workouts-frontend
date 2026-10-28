import { addDays, fromIsoDate, startOfWeek, toIsoDate } from '../../../services/coach/coach-workspace.service';
import type {
  ClientProgramRow,
  ClientSetValues,
  ClientWorkoutSet,
  CoachClientProgram,
  CoachWorkoutStatus,
} from '../../../models/coach-workspace.model';

/** Az ügyfél egy edzése a programban (a sorokból összerakva). */
export interface ClientWorkoutEntry {
  userWorkoutId: number;
  workoutId: number;
  name: string;
  date: string | null;
  dayIndex: number | null;
  completed: boolean;
  startedAt: string | null;
  feedback: string | null;
  exercises: ClientExerciseEntry[];
  setsTotal: number;
  setsCompleted: number;
}

export interface ClientExerciseEntry {
  userWorkoutExerciseId: number;
  workoutExerciseId: number;
  exerciseId: number;
  name: string;
  order: number;
  completed: boolean;
  setsTotal: number;
  setsCompleted: number;
  feedback: string | null;
  templateSets: number | null;
  templateRepetitions: number | null;
  templateRestSeconds: number | null;
}

/** Egy sorozat szerkeszthető sora (minden mező külön, mint a régi felületen). */
export interface EditableSet {
  targetRpe?: number | string | null;
  actualRpe?: number | null;
  rir?: number | null;
  id: number;
  setNumber: number;
  targetRepetitions: number | string | null;
  targetWeightKg: number | string | null;
  restSeconds: number | string | null;
  actualRepetitions: number | string | null;
  actualWeightKg: number | string | null;
  completed: boolean;
  notes: string | null;
  original: ClientSetValues;
}

export interface ExerciseSets {
  exercise: ClientExerciseEntry;
  sets: EditableSet[];
  loading: boolean;
}

export interface WeekGroup {
  label: string;
  from: string;
  to: string;
  workouts: ClientWorkoutEntry[];
}

export type ProgramState = 'active' | 'upcoming' | 'finished';

export function programState(program: CoachClientProgram, today: string): ProgramState {
  if (program.endDate && program.endDate < today) return 'finished';
  if (program.startDate && program.startDate > today) return 'upcoming';
  return 'active';
}

export function programStateKey(program: CoachClientProgram, today: string): string {
  const state = programState(program, today);
  return state === 'finished'
    ? 'coachWorkspace.client.finished'
    : state === 'upcoming'
      ? 'coachWorkspace.client.upcoming'
      : 'coachWorkspace.client.active';
}

/** Aktív programok elöl, aztán a később indulók, végül a befejezettek (legújabb elöl). */
export function sortPrograms(programs: CoachClientProgram[], today: string): CoachClientProgram[] {
  const rank = (p: CoachClientProgram) =>
    programState(p, today) === 'active' ? 0 : programState(p, today) === 'upcoming' ? 1 : 2;
  return [...programs].sort((a, b) => rank(a) - rank(b) || (b.startDate ?? '').localeCompare(a.startDate ?? ''));
}

export function workoutStatus(workout: ClientWorkoutEntry, today: string): CoachWorkoutStatus {
  if (workout.completed) return 'done';
  if (workout.startedAt) return 'inProgress';
  if (workout.date && workout.date < today) return 'missed';
  return 'planned';
}

/** Az edzések naptári hetek szerint; a hét sorszáma a program kezdőhetétől számít. */
export function buildWeeks(workouts: ClientWorkoutEntry[], programStart: string | null): WeekGroup[] {
  const start = programStart ?? workouts[0]?.date ?? null;
  const groups = new Map<string, WeekGroup>();
  for (const workout of workouts) {
    if (!workout.date) continue;
    const monday = startOfWeek(fromIsoDate(workout.date));
    const key = toIsoDate(monday);
    if (!groups.has(key)) {
      const number = start
        ? Math.floor((monday.getTime() - startOfWeek(fromIsoDate(start)).getTime()) / (7 * 86400000)) + 1
        : groups.size + 1;
      groups.set(key, { label: String(number), from: key, to: toIsoDate(addDays(monday, 6)), workouts: [] });
    }
    groups.get(key)!.workouts.push(workout);
  }
  return [...groups.values()];
}

export function groupWorkouts(rows: ClientProgramRow[]): ClientWorkoutEntry[] {
  const byId = new Map<number, ClientWorkoutEntry>();
  for (const row of rows) {
    let workout = byId.get(row.user_workout_id);
    if (!workout) {
      workout = {
        userWorkoutId: row.user_workout_id,
        workoutId: row.workout_id,
        name: row.workout_name ?? '',
        date: row.scheduled_date ?? null,
        dayIndex: row.program_day_index ?? null,
        completed: !!row.workout_completed,
        startedAt: row.workout_started_at ?? null,
        feedback: row.workout_feedback ?? null,
        exercises: [],
        setsTotal: 0,
        setsCompleted: 0,
      };
      byId.set(row.user_workout_id, workout);
    }
    const exercise: ClientExerciseEntry = {
      userWorkoutExerciseId: row.user_workout_exercise_id,
      workoutExerciseId: row.workout_exercise_id,
      exerciseId: row.exercise_id,
      name: row.exercise_name ?? '',
      order: row.exercise_order,
      completed: !!row.exercise_completed,
      setsTotal: Number(row.sets_done ?? 0),
      setsCompleted: Number(row.sets_completed ?? 0),
      feedback: row.exercise_feedback ?? null,
      templateSets: row.template_sets ?? null,
      templateRepetitions: row.template_repetitions ?? null,
      templateRestSeconds: row.template_rest_seconds ?? null,
    };
    workout.exercises.push(exercise);
    workout.setsTotal += exercise.setsTotal;
    workout.setsCompleted += exercise.setsCompleted;
  }
  const list = [...byId.values()];
  for (const workout of list) workout.exercises.sort((a, b) => a.order - b.order);
  return list.sort(
    (a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || (a.dayIndex ?? 0) - (b.dayIndex ?? 0),
  );
}

export function toEditable(set: ClientWorkoutSet): EditableSet {
  const original: ClientSetValues = {
    targetRpe: set.targetRpe == null ? null : Number(set.targetRpe),
    targetRepetitions: set.targetRepetitions,
    targetWeightKg: set.targetWeightKg === null || set.targetWeightKg === undefined ? null : Number(set.targetWeightKg),
    restSeconds: set.restSeconds ?? null,
    actualRepetitions: set.actualRepetitions ?? null,
    actualWeightKg: set.actualWeightKg === null || set.actualWeightKg === undefined ? null : Number(set.actualWeightKg),
    completed: !!set.completed,
    notes: set.notes && set.notes.trim() !== '' ? set.notes : null,
  };
  return {
    id: set.id,
    setNumber: set.setNumber,
    targetRpe: original.targetRpe,
    actualRpe: set.actualRpe == null ? null : Number(set.actualRpe),
    rir: set.rir ?? null,
    targetRepetitions: original.targetRepetitions,
    targetWeightKg: original.targetWeightKg,
    restSeconds: original.restSeconds,
    actualRepetitions: original.actualRepetitions,
    actualWeightKg: original.actualWeightKg,
    completed: original.completed,
    notes: original.notes,
    original,
  };
}

/** A sor értékei mentésre kész formában; érvénytelen értéknél null. */
export function setValues(row: EditableSet): ClientSetValues | null {
  const targetRpe = toNumber(row.targetRpe ?? null);
  if (targetRpe === undefined || (targetRpe !== null && (targetRpe < 0 || targetRpe > 10 || !Number.isInteger(targetRpe * 2)))) return null;
  const target = toInt(row.targetRepetitions);
  if (target === null || target === undefined || target < 1) return null;
  const weight = toNumber(row.targetWeightKg);
  const actualWeight = toNumber(row.actualWeightKg);
  const actualReps = toInt(row.actualRepetitions);
  const rest = toInt(row.restSeconds);
  if (weight === undefined || actualWeight === undefined || actualReps === undefined || rest === undefined) return null;
  if ((weight ?? 0) < 0 || (actualWeight ?? 0) < 0 || (actualReps !== null && actualReps < 1) || (rest ?? 0) < 0) {
    return null;
  }
  const notes = (row.notes ?? '').trim();
  return {
    ...(row.targetRpe !== undefined ? { targetRpe } : {}),
    targetRepetitions: target,
    targetWeightKg: weight,
    actualRepetitions: actualReps,
    actualWeightKg: actualWeight,
    restSeconds: rest,
    notes: notes === '' ? null : notes,
    completed: !!row.completed,
  };
}

/** Eltér-e a sor a mentett állapottól (érvénytelen sor is módosításnak számít). */
export function isSetChanged(row: EditableSet): boolean {
  const now = setValues(row);
  if (!now) return true;
  const o = row.original;
  return (
    (now.targetRpe ?? null) !== (o.targetRpe ?? null) ||
    now.targetRepetitions !== o.targetRepetitions ||
    now.targetWeightKg !== o.targetWeightKg ||
    now.restSeconds !== o.restSeconds ||
    now.actualRepetitions !== o.actualRepetitions ||
    now.actualWeightKg !== o.actualWeightKg ||
    now.completed !== o.completed ||
    now.notes !== o.notes
  );
}

export function isSetInvalid(row: EditableSet): boolean {
  return setValues(row) === null;
}

/** A sor mezőit visszaállítja a mentett értékekre. */
export function restoreSet(row: EditableSet): void {
  const o = row.original;
  row.targetRpe = o.targetRpe;
  row.targetRepetitions = o.targetRepetitions;
  row.targetWeightKg = o.targetWeightKg;
  row.restSeconds = o.restSeconds;
  row.actualRepetitions = o.actualRepetitions;
  row.actualWeightKg = o.actualWeightKg;
  row.completed = o.completed;
  row.notes = o.notes;
}

/** Az első sorozat cél értékei (ismétlés, súly, pihenő, tervezett RPE) a többi, nem teljesített sorozatra. */
export function fillDownSets(entry: ExerciseSets): void {
  const source = entry.sets[0];
  if (!source) return;
  for (const row of entry.sets.slice(1)) {
    if (row.completed) continue;
    row.targetRepetitions = source.targetRepetitions;
    row.targetWeightKg = source.targetWeightKg;
    row.restSeconds = source.restSeconds;
    row.targetRpe = source.targetRpe ?? null;
  }
}

/** Üres → null, egész → szám, egyéb → undefined (érvénytelen). */
function toInt(value: number | string | null): number | null | undefined {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function toNumber(value: number | string | null): number | null | undefined {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
