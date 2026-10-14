import type { CoachWorkoutStatus } from '../../models/coach-workspace.model';

/** Állapot → fordítási kulcs. */
export const STATUS_LABEL: Record<CoachWorkoutStatus, string> = {
  done: 'coachWorkspace.status.done',
  inProgress: 'coachWorkspace.status.inProgress',
  missed: 'coachWorkspace.status.missed',
  planned: 'coachWorkspace.status.planned',
};

/** Állapot → jelvény színe (a szöveg mindig ki van írva, nem csak a szín jelez). */
export const STATUS_BADGE: Record<CoachWorkoutStatus, string> = {
  done: 'bg-primary-100 text-primary-800',
  inProgress: 'bg-info-100 text-info-800',
  missed: 'bg-warning-100 text-warning-800',
  planned: 'bg-surface-100 text-content-700',
};

/** A hét napjainak rövid neve (hétfőtől) fordítási kulcsként. */
export const WEEKDAY_KEYS = [
  'coachWorkspace.weekday.mon',
  'coachWorkspace.weekday.tue',
  'coachWorkspace.weekday.wed',
  'coachWorkspace.weekday.thu',
  'coachWorkspace.weekday.fri',
  'coachWorkspace.weekday.sat',
  'coachWorkspace.weekday.sun',
];

export const DIFFICULTY_OPTIONS = [
  { value: 'BEGINNER', label: 'coachWorkspace.difficulty.BEGINNER' },
  { value: 'INTERMEDIATE', label: 'coachWorkspace.difficulty.INTERMEDIATE' },
  { value: 'ADVANCED', label: 'coachWorkspace.difficulty.ADVANCED' },
];

/** A kliens neve első betűje az avatárhoz. */
export function initial(name: string | null | undefined): string {
  return (name ?? '?').trim().charAt(0).toUpperCase() || '?';
}

/** Hibából megjeleníthető üzenet (backend üzenet vagy fordítási kulcs). */
export function errorText(error: unknown, fallbackKey: string): string {
  if (error && typeof error === 'object') {
    const httpError = error as { error?: { message?: unknown }; message?: unknown };
    if (httpError.error && typeof httpError.error.message === 'string' && httpError.error.message) {
      return httpError.error.message;
    }
    if (typeof httpError.message === 'string' && httpError.message && !httpError.message.startsWith('Http failure')) {
      return httpError.message;
    }
  }
  return fallbackKey;
}

/** Százalék 0–100, osztás nullával nélkül. */
export function percent(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}
