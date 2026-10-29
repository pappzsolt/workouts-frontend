import type { CoachProgram, CoachProgramDetailsInput } from '../../../models/coach-workspace.model';
import { toIsoDate } from '../../../shared/local-date';
import { type DayCell, dateForDay, dayForDate } from './program-days';

/** Shared program context and request status for one editor instance. */
export class ProgramEditorState {
  programId: number | null = null;
  loading = false;
  savingDetails = false;
  busy = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  messageParams: Record<string, unknown> = {};
  newForUserId: number | null = null;
  form: CoachProgramDetailsInput = {
    programName: '',
    programDescription: '',
    durationDays: 28,
    difficultyLevel: 'BEGINNER',
    startDate: toIsoDate(new Date()),
  };
  program: CoachProgram | null = null;
  cells: DayCell[] = [];
  leadingBlanks: number[] = [];
  selectedDay = 1;
  pendingDay: number | null = null;
  get selectedCell(): DayCell | null {
    return this.cells.find((cell) => cell.day === this.selectedDay) ?? null;
  }

  dateForDay(day: number): string {
    return dateForDay(this.form.startDate, day);
  }

  get firstDate(): string {
    return this.form.startDate ? this.dateForDay(1) : '';
  }

  get lastDate(): string {
    return this.form.startDate ? this.dateForDay(this.cells.length || 1) : '';
  }

  dayForDate(value: string): number {
    return dayForDate(this.form.startDate, value);
  }
}
