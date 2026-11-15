import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { buildCalendarMonth } from '../../../../shared/calendar-month';
import { toIsoDate } from '../../../../shared/local-date';

export interface PersonalMoveDateOption {
  dayIndex: number;
  date: Date;
}

/** A calendar picker for allowed reschedule dates only; the parent and backend keep all validation. */
@Component({
  selector: 'app-personal-move-date-picker',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './personal-move-date-picker.component.html',
})
export class PersonalMoveDatePickerComponent implements OnChanges {
  @Input() options: readonly PersonalMoveDateOption[] = [];
  @Input() selectedDay: number | null = null;
  @Input() disabled = false;
  @Input() contextDay: number | null = null;
  @Output() readonly selectedDayChange = new EventEmitter<number>();

  expanded = false;
  displayedMonth: number | null = null;
  readonly weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  readonly months = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];

  private monthOf(date: Date): number { return date.getFullYear() * 12 + date.getMonth(); }
  get firstMonth(): number | null { return this.options.length ? this.monthOf(this.options[0].date) : null; }
  get lastMonth(): number | null {
    return this.options.length ? this.monthOf(this.options[this.options.length - 1].date) : null;
  }
  get selectedOption(): PersonalMoveDateOption | undefined {
    return this.options.find(option => option.dayIndex === this.selectedDay);
  }
  get visibleMonth(): Date | null {
    const index = this.displayedMonth ?? this.firstMonth;
    return index == null ? null : new Date(Math.floor(index / 12), index % 12, 1);
  }
  get canPrevious(): boolean {
    return this.firstMonth != null && this.displayedMonth != null && this.displayedMonth > this.firstMonth;
  }
  get canNext(): boolean {
    return this.lastMonth != null && this.displayedMonth != null && this.displayedMonth < this.lastMonth;
  }
  get calendarDays(): { date: Date; currentMonth: boolean; dayIndex: number | null }[] {
    const month = this.visibleMonth;
    if (!month) return [];
    const allowed = new Map(this.options.map(option => [toIsoDate(option.date), option.dayIndex]));
    return buildCalendarMonth(month.getFullYear(), month.getMonth(), new Date()).map(day => ({
      date: day.date,
      currentMonth: day.currentMonth,
      dayIndex: day.currentMonth ? (allowed.get(toIsoDate(day.date)) ?? null) : null,
    }));
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Switching the source workout must not leave an old date picker open.
    if (changes['contextDay'] && !changes['contextDay'].firstChange) this.close();
  }

  toggle(): void {
    if (this.disabled || !this.options.length) return;
    this.expanded = !this.expanded;
    if (this.expanded) {
      this.displayedMonth = this.monthOf(this.selectedOption?.date ?? this.options[0].date);
    }
  }
  close(): void { this.expanded = false; }
  navigate(direction: -1 | 1): void {
    if (this.disabled || (direction < 0 ? !this.canPrevious : !this.canNext)) return;
    this.displayedMonth = this.displayedMonth! + direction;
  }
  select(dayIndex: number | null): void {
    if (this.disabled || dayIndex == null || !this.options.some(option => option.dayIndex === dayIndex)) return;
    this.selectedDayChange.emit(dayIndex);
    this.close();
  }
}
