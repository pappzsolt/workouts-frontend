import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';

import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { WEEKDAY_KEYS } from '../../coach-ui';
import { DayCell } from '../program-days';

/** A program napjainak heti rácsa. */
@Component({
  selector: 'app-program-day-grid',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AppIconComponent],
  templateUrl: './program-day-grid.component.html',
  host: { class: 'contents' },
})
export class ProgramDayGridComponent implements OnChanges {
  readonly weekdayKeys = WEEKDAY_KEYS;
  @Input() cells: DayCell[] = [];
  @Input() leadingBlanks: number[] = [];
  @Input() selectedDay = 1;
  @Input() busy = false;
  @Input() showMultiAdd = true;
  @Input() showProgramDay = true;
  @Output() readonly daySelected = new EventEmitter<number>();
  @Output() readonly openMulti = new EventEmitter<void>();

  get selectedCell(): DayCell | null {
    return this.cells.find(cell => cell.day === this.selectedDay) ?? null;
  }

  private monthIndex: number | null = null;
  readonly monthKeys = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];

  private indexOf(date: Date): number {
    return date.getFullYear() * 12 + date.getMonth();
  }

  get firstMonth(): number | null {
    const date = this.cells[0]?.date;
    return date ? this.indexOf(date) : null;
  }

  get lastMonth(): number | null {
    const date = this.cells[this.cells.length - 1]?.date;
    return date ? this.indexOf(date) : null;
  }

  get visibleMonth(): Date | null {
    const index = this.monthIndex ?? this.firstMonth;
    return index === null ? null : new Date(Math.floor(index / 12), index % 12, 1);
  }

  get canGoBack(): boolean {
    return this.visibleMonth !== null && this.firstMonth !== null && this.indexOf(this.visibleMonth) > this.firstMonth;
  }

  get canGoForward(): boolean {
    return this.visibleMonth !== null && this.lastMonth !== null && this.indexOf(this.visibleMonth) < this.lastMonth;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.firstMonth === null || this.lastMonth === null) {
      this.monthIndex = null;
      return;
    }
    if (this.monthIndex === null || changes['selectedDay']) {
      const selected = this.cells.find(cell => cell.day === this.selectedDay)?.date;
      this.monthIndex = selected ? this.indexOf(selected) : this.firstMonth;
    }
    this.monthIndex = Math.max(this.firstMonth, Math.min(this.lastMonth, this.monthIndex));
  }

  changeMonth(direction: -1 | 1): void {
    if ((direction === -1 && !this.canGoBack) || (direction === 1 && !this.canGoForward)) return;
    this.monthIndex = this.indexOf(this.visibleMonth!) + direction;
  }

  get calendarDays(): { date: Date | null; cell: DayCell | null }[] {
    const first = this.cells[0]?.date;
    const last = this.cells[this.cells.length - 1]?.date;
    if (!first || !last) return this.cells.map(cell => ({ date: cell.date, cell }));
    const byDate = new Map(this.cells.map(cell => [cell.date?.getTime(), cell]));
    const month = this.visibleMonth!;
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const days: { date: Date; cell: DayCell | null }[] = [];
    for (const date = new Date(month); date <= end; date.setDate(date.getDate() + 1)) {
      days.push({ date: new Date(date), cell: byDate.get(date.getTime()) ?? null });
    }
    return days;
  }

  get calendarLeadingBlanks(): number[] {
    const first = this.visibleMonth;
    if (!first) return this.leadingBlanks;
    const offset = (new Date(first.getFullYear(), first.getMonth(), 1).getDay() + 6) % 7;
    return Array.from({ length: offset }, (_, index) => index);
  }

}
