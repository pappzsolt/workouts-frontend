import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { WEEKDAY_KEYS } from '../../coach-ui';
import type { DayCell } from '../program-days';

/** Seven program days per page; paging never discards the selected day's draft. */
@Component({
  selector: 'app-program-week-planner',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AppIconComponent],
  templateUrl: './program-week-planner.component.html',
  host: { class: 'contents' },
})
export class ProgramWeekPlannerComponent implements OnChanges {
  @Input() cells: DayCell[] = [];
  @Input() selectedDay = 1;
  @Input() busy = false;
  @Output() readonly daySelected = new EventEmitter<number>();
  @Output() readonly openMulti = new EventEmitter<void>();
  readonly weekdayKeys = WEEKDAY_KEYS;
  weekIndex = 0;
  private startKey: number | null = null;

  get weekCount(): number { return Math.max(1, Math.ceil(this.cells.length / 7)); }
  get visibleDays(): DayCell[] { return this.cells.slice(this.weekIndex * 7, this.weekIndex * 7 + 7); }

  ngOnChanges(changes: SimpleChanges): void {
    const startKey = this.cells[0]?.date?.getTime() ?? null;
    if (changes['selectedDay'] || startKey !== this.startKey) {
      this.weekIndex = Math.floor(Math.max(0, this.selectedDay - 1) / 7);
    }
    this.startKey = startKey;
    this.weekIndex = Math.min(Math.max(0, this.weekIndex), this.weekCount - 1);
  }

  changeWeek(direction: -1 | 1): void {
    if (this.busy) return;
    this.weekIndex = Math.min(Math.max(0, this.weekIndex + direction), this.weekCount - 1);
  }
}
