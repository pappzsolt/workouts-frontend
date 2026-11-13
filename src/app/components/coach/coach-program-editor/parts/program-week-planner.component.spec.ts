import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { buildDayCells } from '../program-days';
import { ProgramWeekPlannerComponent } from './program-week-planner.component';

describe('Program week planner', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ProgramWeekPlannerComponent], providers: [provideTranslateService()] }));
  function render(duration = 16) {
    const fixture = TestBed.createComponent(ProgramWeekPlannerComponent);
    fixture.componentRef.setInput('cells', buildDayCells(null, [], duration, '2026-12-25').cells);
    fixture.componentRef.setInput('selectedDay', 1);
    fixture.detectChanges();
    return fixture;
  }

  it('pages through seven program days and a partial final week across a year boundary', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    const next = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[aria-label="coachWorkspace.editor.nextWeek"]')!;
    expect(component.visibleDays.map(day => day.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    next.click(); fixture.detectChanges();
    expect(component.visibleDays[0].date).toEqual(new Date(2027, 0, 1));
    expect(component.visibleDays.map(day => day.day)).toEqual([8, 9, 10, 11, 12, 13, 14]);
    next.click(); fixture.detectChanges();
    expect(component.visibleDays.map(day => day.day)).toEqual([15, 16]);
    expect(next.disabled).toBeTrue();
    component.changeWeek(1);
    expect(component.weekIndex).toBe(2);
  });

  it('does not change the selected day when paging and emits explicit day selection', () => {
    const fixture = render();
    const selected = spyOn(fixture.componentInstance.daySelected, 'emit');
    fixture.componentInstance.changeWeek(1); fixture.detectChanges();
    expect(selected).not.toHaveBeenCalled();
    expect(fixture.componentInstance.selectedDay).toBe(1);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-program-day="9"]')!.click();
    expect(selected).toHaveBeenCalledOnceWith(9);
  });

  it('follows a changed selection and clamps the week when a program is shortened', () => {
    const fixture = render();
    fixture.componentRef.setInput('selectedDay', 15); fixture.detectChanges();
    expect(fixture.componentInstance.weekIndex).toBe(2);
    fixture.componentRef.setInput('cells', buildDayCells(null, [], 3, '2026-12-25').cells);
    fixture.componentRef.setInput('selectedDay', 1); fixture.detectChanges();
    expect(fixture.componentInstance.weekIndex).toBe(0);
    expect(fixture.componentInstance.visibleDays.length).toBe(3);
  });

  it('disables week navigation and day selection while an operation is running', () => {
    const fixture = render();
    fixture.componentRef.setInput('busy', true); fixture.detectChanges();
    const selected = spyOn(fixture.componentInstance.daySelected, 'emit');
    const element = fixture.nativeElement as HTMLElement;
    expect([...element.querySelectorAll('button')].every(button => button.disabled)).toBeTrue();
    element.querySelector<HTMLButtonElement>('[data-program-day="2"]')!.click();
    fixture.componentInstance.changeWeek(1);
    expect(fixture.componentInstance.weekIndex).toBe(0);
    expect(selected).not.toHaveBeenCalled();
  });
});
