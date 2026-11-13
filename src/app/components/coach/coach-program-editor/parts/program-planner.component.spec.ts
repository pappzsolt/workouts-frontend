import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { buildDayCells } from '../program-days';
import { ProgramPlannerComponent } from './program-planner.component';

describe('Program month planner', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ProgramPlannerComponent], providers: [provideTranslateService()] }));
  function render(duration = 16, start = '2026-12-25') {
    const fixture = TestBed.createComponent(ProgramPlannerComponent);
    fixture.componentRef.setInput('cells', buildDayCells(null, [], duration, start).cells);
    fixture.componentRef.setInput('selectedDay', 1);
    fixture.detectChanges();
    return fixture;
  }

  it('shows complete months Monday-first and limits paging to the program months across a year boundary', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    const next = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[aria-label="userWorkoutsCalendar.nextMonth"]')!;
    expect(component.calendarDays[0].date?.getDay()).toBe(1);
    expect(component.calendarDays.filter(day => day.currentMonth).length).toBe(31);
    expect(component.calendarDays.filter(day => day.cell).map(day => day.cell!.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(component.canGoBack).toBeFalse();
    next.click(); fixture.detectChanges();
    expect(component.visibleMonth).toEqual(new Date(2027, 0, 1));
    expect(component.calendarDays.filter(day => day.currentMonth).length).toBe(31);
    expect(component.calendarDays.filter(day => day.cell).map(day => day.cell!.day)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16]);
    expect(next.disabled).toBeTrue();
    component.changeMonth(1);
    expect(component.visibleMonth).toEqual(new Date(2027, 0, 1));
  });

  it('does not change the selected day when paging and emits explicit day selection', () => {
    const fixture = render();
    const selected = spyOn(fixture.componentInstance.daySelected, 'emit');
    fixture.componentInstance.changeMonth(1); fixture.detectChanges();
    expect(selected).not.toHaveBeenCalled();
    expect(fixture.componentInstance.selectedDay).toBe(1);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-program-day="9"]')!.click();
    expect(selected).toHaveBeenCalledOnceWith(9);
  });

  it('follows a changed selection and clamps the month when a program is shortened', () => {
    const fixture = render();
    fixture.componentRef.setInput('selectedDay', 15); fixture.detectChanges();
    expect(fixture.componentInstance.visibleMonth).toEqual(new Date(2027, 0, 1));
    fixture.componentRef.setInput('cells', buildDayCells(null, [], 3, '2026-12-25').cells);
    fixture.componentRef.setInput('selectedDay', 1); fixture.detectChanges();
    expect(fixture.componentInstance.visibleMonth).toEqual(new Date(2026, 11, 1));
    expect(fixture.componentInstance.calendarDays.filter(day => day.cell).length).toBe(3);
    expect(fixture.componentInstance.canGoForward).toBeFalse();
  });

  it('renders all 42 program days once across two months and leaves outside dates inactive', () => {
    const fixture = render(42, '2026-10-13');
    const component = fixture.componentInstance;
    const selected = spyOn(component.daySelected, 'emit');
    const first = component.calendarDays.filter(day => day.cell).map(day => day.cell!.day);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('[data-program-day]').length).toBe(19);
    const outside = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[aria-disabled="true"]')!;
    outside.click();
    expect(selected).not.toHaveBeenCalled();
    component.changeMonth(1); fixture.detectChanges();
    const second = component.calendarDays.filter(day => day.cell).map(day => day.cell!.day);
    expect([...first, ...second]).toEqual(Array.from({ length: 42 }, (_, index) => index + 1));
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('[data-program-day]').length).toBe(23);
  });

  it('disables month navigation and program-day selection while an operation is running', () => {
    const fixture = render();
    fixture.componentRef.setInput('busy', true); fixture.detectChanges();
    const selected = spyOn(fixture.componentInstance.daySelected, 'emit');
    const element = fixture.nativeElement as HTMLElement;
    expect([...element.querySelectorAll('button')].every(button => button.disabled)).toBeTrue();
    element.querySelector<HTMLButtonElement>('[data-program-day="2"]')!.click();
    fixture.componentInstance.changeMonth(1);
    expect(fixture.componentInstance.visibleMonth).toEqual(new Date(2026, 11, 1));
    expect(selected).not.toHaveBeenCalled();
  });
});
