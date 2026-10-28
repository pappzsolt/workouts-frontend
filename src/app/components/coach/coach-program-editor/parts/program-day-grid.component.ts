import { Component, EventEmitter, Input, Output } from '@angular/core';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { WEEKDAY_KEYS } from '../../coach-ui';
import { DayCell, dayAriaLabel } from '../program-days';

/** A program napjainak heti rácsa. */
@Component({
  selector: 'app-program-day-grid',
  standalone: true,
  imports: [...SHARED_IMPORTS],
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

  dayAriaLabel(cell: DayCell): string {
    return dayAriaLabel(cell);
  }
}
