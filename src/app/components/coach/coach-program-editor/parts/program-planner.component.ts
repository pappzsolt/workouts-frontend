import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { WEEKDAY_KEYS } from '../../coach-ui';
import { buildCalendarMonth } from '../../../../shared/calendar-month';
import { toIsoDate } from '../../../../shared/local-date';
import type { DayCell } from '../program-days';

/** Month view of the program period; paging never discards the selected day’s draft. */
@Component({
  selector: 'app-program-planner',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AppIconComponent],
  templateUrl: './program-planner.component.html',
  host: { class: 'contents' },
})
export class ProgramPlannerComponent implements OnChanges {
  @Input() cells: DayCell[] = [];
  @Input() selectedDay = 1;
  @Input() busy = false;
  @Output() readonly daySelected = new EventEmitter<number>();
  @Output() readonly openMulti = new EventEmitter<void>();
  readonly weekdayKeys = WEEKDAY_KEYS;
  private monthIndex: number | null = null;
  private startKey: number | null = null;
  readonly monthKeys = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];

  private indexOf(date: Date): number { return date.getFullYear() * 12 + date.getMonth(); }
  get firstMonth(): number | null { return this.cells[0]?.date ? this.indexOf(this.cells[0].date) : null; }
  get lastMonth(): number | null {
    const date = this.cells[this.cells.length - 1]?.date;
    return date ? this.indexOf(date) : null;
  }
  get visibleMonth(): Date | null {
    const index = this.monthIndex ?? this.firstMonth;
    return index === null ? null : new Date(Math.floor(index / 12), index % 12, 1);
  }
  get canGoBack(): boolean { return this.visibleMonth !== null && this.firstMonth !== null && this.indexOf(this.visibleMonth) > this.firstMonth; }
  get canGoForward(): boolean { return this.visibleMonth !== null && this.lastMonth !== null && this.indexOf(this.visibleMonth) < this.lastMonth; }

  get calendarDays(): { date: Date | null; cell: DayCell | null; currentMonth: boolean }[] {
    const month = this.visibleMonth;
    if (!month) return this.cells.map(cell => ({ date: cell.date, cell, currentMonth: true }));
    const byDate = new Map(this.cells.filter(cell => cell.date).map(cell => [toIsoDate(cell.date!), cell]));
    return buildCalendarMonth(month.getFullYear(), month.getMonth(), new Date()).map(day => ({
      ...day, cell: day.currentMonth ? byDate.get(toIsoDate(day.date)) ?? null : null,
    }));
  }

  ngOnChanges(changes: SimpleChanges): void {
    const startKey = this.cells[0]?.date?.getTime() ?? null;
    if (changes['selectedDay'] || startKey !== this.startKey) {
      const date = this.cells.find(cell => cell.day === this.selectedDay)?.date;
      this.monthIndex = date ? this.indexOf(date) : this.firstMonth;
    }
    this.startKey = startKey;
    if (this.firstMonth !== null && this.lastMonth !== null) {
      this.monthIndex = Math.min(Math.max(this.monthIndex ?? this.firstMonth, this.firstMonth), this.lastMonth);
    } else this.monthIndex = null;
  }

  changeMonth(direction: -1 | 1): void {
    if (this.busy || !this.visibleMonth || (direction === -1 ? !this.canGoBack : !this.canGoForward)) return;
    this.monthIndex = this.indexOf(this.visibleMonth) + direction;
  }
}
