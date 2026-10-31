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

  dayAriaLabel(cell: DayCell): string {
    return dayAriaLabel(cell);
  }
}
