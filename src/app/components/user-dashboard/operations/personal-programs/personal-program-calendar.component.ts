import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { buildCalendarMonth } from '../../../../shared/calendar-month';
import { toIsoDate } from '../../../../shared/local-date';
import type { DayCell } from '../../../coach/coach-program-editor/program-days';

/** Compact calendar owned by the personal multi-day editor. Does not modify the coach planner. */
@Component({
  selector: 'app-personal-program-calendar',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './personal-program-calendar.component.html',
})
export class PersonalProgramCalendarComponent implements OnChanges {
  @Input() cells: DayCell[] = [];
  @Input() selectedDay = 1;
  @Input() busy = false;
  @Output() readonly daySelected = new EventEmitter<number>();

  mode: 'week' | 'month' = 'month';
  readonly weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  readonly months = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];
  private page = 0;
  private monthIndex: number | null = null;
  private startKey: number | null = null;

  private monthOf(date: Date): number { return date.getFullYear() * 12 + date.getMonth(); }
  get dated(): boolean { return !!this.cells[0]?.date; }
  get firstMonth(): number | null { return this.cells[0]?.date ? this.monthOf(this.cells[0].date) : null; }
  get lastMonth(): number | null {
    const date = this.cells[this.cells.length - 1]?.date;
    return date ? this.monthOf(date) : null;
  }
  get visibleMonth(): Date | null {
    const month = this.monthIndex ?? this.firstMonth;
    return month === null ? null : new Date(Math.floor(month / 12), month % 12, 1);
  }
  get pageSize(): number { return this.mode === 'week' ? 7 : 28; }
  get pageStart(): number { return this.page * this.pageSize; }
  get pageEnd(): number { return Math.min(this.cells.length, this.pageStart + this.pageSize); }
  get canBack(): boolean {
    return this.dated && this.mode === 'month'
      ? this.monthIndex !== null && this.firstMonth !== null && this.monthIndex > this.firstMonth
      : this.page > 0;
  }
  get canForward(): boolean {
    return this.dated && this.mode === 'month'
      ? this.monthIndex !== null && this.lastMonth !== null && this.monthIndex < this.lastMonth
      : this.pageEnd < this.cells.length;
  }
  get calendarDays(): { date: Date | null; cell: DayCell | null; currentMonth: boolean }[] {
    if (this.dated && this.mode === 'month' && this.visibleMonth) {
      const byDate = new Map(
        this.cells.filter(cell => cell.date).map(cell => [toIsoDate(cell.date!), cell]),
      );
      const month = this.visibleMonth;
      return buildCalendarMonth(month.getFullYear(), month.getMonth(), new Date()).map(item => ({
        ...item,
        cell: item.currentMonth ? byDate.get(toIsoDate(item.date)) ?? null : null,
      }));
    }
    return this.cells.slice(this.pageStart, this.pageEnd).map(cell => ({
      date: cell.date, cell, currentMonth: true,
    }));
  }

  ngOnChanges(changes: SimpleChanges): void {
    const startKey = this.cells[0]?.date?.getTime() ?? null;
    if (changes['selectedDay'] || startKey !== this.startKey) this.focusSelection();
    this.startKey = startKey;
    this.clampPage();
  }

  changeMode(mode: 'week' | 'month'): void {
    this.mode = mode;
    this.focusSelection();
  }

  changePage(direction: -1 | 1): void {
    if (this.busy || (direction < 0 ? !this.canBack : !this.canForward)) return;
    if (this.dated && this.mode === 'month') this.monthIndex = (this.monthIndex ?? this.firstMonth!) + direction;
    else this.page += direction;
  }

  private focusSelection(): void {
    const index = Math.max(0, this.cells.findIndex(cell => cell.day === this.selectedDay));
    this.page = Math.floor(index / this.pageSize);
    const date = this.cells[index]?.date;
    this.monthIndex = date ? this.monthOf(date) : this.firstMonth;
  }

  private clampPage(): void {
    this.page = Math.max(0, Math.min(this.page, Math.max(0, Math.ceil(this.cells.length / this.pageSize) - 1)));
    if (this.firstMonth !== null && this.lastMonth !== null) {
      this.monthIndex = Math.min(this.lastMonth, Math.max(this.firstMonth, this.monthIndex ?? this.firstMonth));
    } else this.monthIndex = null;
  }
}
