import type { CalendarDay } from '../models/common/calendar-day.model';

/** Local calendar dates, Monday first, padded only to the final full week. Month is zero-based. */
export function buildCalendarMonth(year: number, month: number, today: Date): CalendarDay[] {
  const days: CalendarDay[] = [];
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
  const previousMonthLastDay = new Date(year, month, 0).getDate();

  const append = (date: Date, currentMonth: boolean): void => {
    days.push({
      date, currentMonth,
      isToday: date.getFullYear() === today.getFullYear()
        && date.getMonth() === today.getMonth()
        && date.getDate() === today.getDate(),
    });
  };

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    append(new Date(year, month - 1, previousMonthLastDay - i), false);
  }
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    append(new Date(year, month, day), true);
  }
  let nextMonthDay = 1;
  while (days.length % 7 !== 0) {
    append(new Date(year, month + 1, nextMonthDay++), false);
  }
  return days;
}
