import { PersonalProgramCalendarComponent } from './personal-program-calendar.component';
import type { DayCell } from '../../../coach/coach-program-editor/program-days';
import { addDays } from '../../../../shared/local-date';

const cells = (count: number, dated: boolean): DayCell[] => Array.from({ length: count }, (_, i) => ({
  day: i + 1, date: dated ? addDays(new Date(2026, 10, 18), i) : null,
  workout: null, link: null, label: '',
}));

describe('Personal program calendar', () => {
  it('paginates undated program days without creating artificial calendar dates', () => {
    const calendar = new PersonalProgramCalendarComponent();
    calendar.cells = cells(35, false);
    calendar.ngOnChanges({});
    expect(calendar.calendarDays.length).toBe(28);
    calendar.changePage(1);
    expect(calendar.calendarDays.map(day => day.cell?.day)).toEqual([29, 30, 31, 32, 33, 34, 35]);
    calendar.changeMode('week');
    expect(calendar.calendarDays.length).toBe(7);
  });

  it('allows navigating months with real local start dates', () => {
    const calendar = new PersonalProgramCalendarComponent();
    calendar.cells = cells(40, true);
    calendar.selectedDay = 1;
    calendar.ngOnChanges({});
    expect(calendar.visibleMonth?.getMonth()).toBe(10);
    expect(calendar.canForward).toBeTrue();
    calendar.changePage(1);
    expect(calendar.visibleMonth?.getMonth()).toBe(11);
    expect(calendar.calendarDays.some(day => day.cell?.day === 15)).toBeTrue();
  });

  it('keeps the selected day in view when switching between week and month', () => {
    const calendar = new PersonalProgramCalendarComponent();
    calendar.cells = cells(40, false);
    calendar.selectedDay = 18;
    calendar.ngOnChanges({});
    calendar.changeMode('week');
    expect(calendar.calendarDays.some(day => day.cell?.day === 18)).toBeTrue();
    calendar.changeMode('month');
    expect(calendar.calendarDays.some(day => day.cell?.day === 18)).toBeTrue();
  });
});
