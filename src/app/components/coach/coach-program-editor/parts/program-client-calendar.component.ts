import { Component, DestroyRef, Input, OnChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AppInputDirective } from '../../../shared/components/form-controls/app-input.directive';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { errorText } from '../../coach-ui';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { CoachWorkspaceService } from '../../../../services/coach/coach-workspace.service';
import type { CoachClientOverview } from '../../../../models/coach-workspace.model';
import { addDays, calendarDaysBetween, fromIsoDate, toIsoDate } from '../../../../shared/local-date';
import { groupWorkouts, type ClientWorkoutEntry } from '../../coach-client-detail/client-plan';
import type { DayCell } from '../program-days';
import { ProgramDayGridComponent } from './program-day-grid.component';

/** A single client's actual program schedule; editing always targets a user-workout ID. */
@Component({
  selector: 'app-program-client-calendar',
  standalone: true,
  imports: [FormsModule, AppInputDirective, MessageComponent, CommonModule, RouterModule, TranslatePipe, ProgramDayGridComponent],
  templateUrl: './program-client-calendar.component.html',
})
export class ProgramClientCalendarComponent implements OnChanges {
  @Input({ required: true }) client!: CoachClientOverview;
  @Input({ required: true }) programId!: number;
  @Input({ required: true }) startDate!: string;
  @Input({ required: true }) durationDays!: number;
  private readonly workspace = inject(CoachWorkspaceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cancelled$ = new Subject<void>();
  loading = false;
  failed = false;
  cells: DayCell[] = [];
  selectedDay = 1;
  workouts: ClientWorkoutEntry[] = [];
  moveDates: Record<number, string> = {};
  movingWorkoutId: number | null = null;
  message = '';
  messageType: 'success' | 'error' = 'success';

  get minDate(): string {
    return this.client.programs.find(program => program.programId === this.programId)?.startDate ?? this.startDate;
  }

  get maxDate(): string {
    return this.client.programs.find(program => program.programId === this.programId)?.endDate
      ?? (this.minDate ? toIsoDate(addDays(fromIsoDate(this.minDate), Math.max(1, this.durationDays) - 1)) : '');
  }

  canMove(workout: ClientWorkoutEntry): boolean {
    const date = this.moveDates[workout.userWorkoutId];
    return !this.loading && !this.failed && this.movingWorkoutId === null
      && this.workouts.includes(workout) && !workout.completed && !workout.startedAt
      && !!date && /^\d{4}-\d{2}-\d{2}$/.test(date) && toIsoDate(fromIsoDate(date)) === date
      && date !== workout.date && (!this.minDate || date >= this.minDate) && (!this.maxDate || date <= this.maxDate);
  }

  moveWorkout(workout: ClientWorkoutEntry): void {
    if (!this.canMove(workout)) return;
    const id = workout.userWorkoutId;
    const date = this.moveDates[id];
    this.movingWorkoutId = id;
    this.message = '';
    this.workspace.rescheduleWorkout(id, date)
      .pipe(takeUntil(this.cancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.movingWorkoutId = null;
          this.workouts = this.workouts.map(entry => entry.userWorkoutId === id ? { ...entry, date } : entry);
          this.buildCells(date);
          this.messageType = 'success';
          this.message = 'coachWorkspace.client.rescheduled';
        },
        error: error => {
          this.movingWorkoutId = null;
          this.messageType = 'error';
          this.message = errorText(error, 'coachWorkspace.client.rescheduleError');
        },
      });
  }

  ngOnChanges(): void { this.load(); }

  load(): void {
    this.cancelled$.next();
    this.movingWorkoutId = null;
    this.moveDates = {};
    this.message = '';
    this.loading = true;
    this.failed = false;
    this.cells = [];
    this.workouts = [];
    this.selectedDay = 1;
    this.workspace.getClientProgramRows(this.client.userId, this.programId)
      .pipe(takeUntil(this.cancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: rows => {
          this.workouts = groupWorkouts(rows);
          this.moveDates = Object.fromEntries(this.workouts.map(workout => [workout.userWorkoutId, workout.date ?? '']));
          this.buildCells();
          this.loading = false;
        },
        error: () => { this.loading = false; this.failed = true; },
      });
  }

  private buildCells(selectDate?: string): void {
    const dates = this.workouts.map(workout => workout.date).filter((date): date is string => !!date).sort();
    const programStart = this.startDate || dates[0] || toIsoDate(new Date());
    const programEnd = toIsoDate(addDays(fromIsoDate(programStart), Math.max(1, this.durationDays) - 1));
    const start = fromIsoDate(dates[0] && dates[0] < programStart ? dates[0] : programStart);
    const end = fromIsoDate(dates.at(-1) && dates.at(-1)! > programEnd ? dates.at(-1)! : programEnd);
    const byDate = new Map<string, ClientWorkoutEntry[]>();
    for (const workout of this.workouts) {
      if (!workout.date) continue;
      byDate.set(workout.date, [...(byDate.get(workout.date) ?? []), workout]);
    }
    this.cells = Array.from({ length: calendarDaysBetween(start, end) + 1 }, (_, index) => {
      const date = addDays(start, index);
      const entries = byDate.get(toIsoDate(date)) ?? [];
      const name = entries.map(entry => entry.name).join(' · ');
      return {
        day: index + 1, date, link: null, label: name, workoutCount: entries.length,
        workout: entries.length ? {
          workoutId: entries[0].workoutId, programWorkoutId: 0, name, description: null, exercises: [],
        } : null,
      };
    });
    this.selectedDay = (selectDate ? this.cells.find(cell => cell.date && toIsoDate(cell.date) === selectDate)?.day : undefined)
      ?? this.cells.find(cell => cell.workout)?.day ?? 1;
  }

  get selectedDate(): string | null {
    const date = this.cells.find(cell => cell.day === this.selectedDay)?.date;
    return date ? toIsoDate(date) : null;
  }

  get selectedWorkouts(): ClientWorkoutEntry[] {
    return this.workouts.filter(workout => workout.date === this.selectedDate);
  }
}
