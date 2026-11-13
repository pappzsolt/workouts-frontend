import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { WEEKDAY_KEYS } from '../../coach-ui';
import { DayCell, dayAriaLabel } from '../program-days';

/** A program napjainak heti rácsa. */
@Component({
  selector: 'app-program-day-grid',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AppIconComponent],
  templateUrl: './program-day-grid.component.html',
  host: { class: 'contents' },
})
export class ProgramDayGridComponent {
  readonly weekdayKeys = WEEKDAY_KEYS;
  @Input() cells: DayCell[] = [];
  @Input() leadingBlanks: number[] = [];
  @Input() selectedDay = 1;
  @Input() busy = false;
  @Output() readonly daySelected = new EventEmitter<number>();
  @Output() readonly openMulti = new EventEmitter<void>();

  get calendarDays(): { date: Date | null; cell: DayCell | null }[] {
    const first = this.cells[0]?.date;
    const last = this.cells[this.cells.length - 1]?.date;
    if (!first || !last) return this.cells.map(cell => ({ date: cell.date, cell }));
    const byDate = new Map(this.cells.map(cell => [cell.date?.getTime(), cell]));
    const end = new Date(last.getFullYear(), last.getMonth() + 1, 0);
    const days: { date: Date; cell: DayCell | null }[] = [];
    for (const date = new Date(first.getFullYear(), first.getMonth(), 1); date <= end; date.setDate(date.getDate() + 1)) {
      days.push({ date: new Date(date), cell: byDate.get(date.getTime()) ?? null });
    }
    return days;
  }

  get calendarLeadingBlanks(): number[] {
    const first = this.cells[0]?.date;
    if (!first) return this.leadingBlanks;
    const offset = (new Date(first.getFullYear(), first.getMonth(), 1).getDay() + 6) % 7;
    return Array.from({ length: offset }, (_, index) => index);
  }

  dayAriaLabel(cell: DayCell): string {
    return dayAriaLabel(cell);
  }
}
