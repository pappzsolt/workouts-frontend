import { PersonalMoveDatePickerComponent } from './personal-move-date-picker.component';

/** UI-only regression: unavailable dates must never emit a reschedule selection. */
describe('Personal move date picker', () => {
  let picker: PersonalMoveDatePickerComponent;

  beforeEach(() => {
    picker = new PersonalMoveDatePickerComponent();
    picker.options = [
      { dayIndex: 3, date: new Date(2030, 0, 3) },
      { dayIndex: 6, date: new Date(2030, 0, 6) },
      { dayIndex: 37, date: new Date(2030, 1, 6) },
    ];
  });

  it('opens on the first available month and disables unavailable days', () => {
    picker.toggle();
    expect(picker.visibleMonth?.getMonth()).toBe(0);
    const day3 = picker.calendarDays.find(day => day.date.getDate() === 3 && day.currentMonth);
    const day4 = picker.calendarDays.find(day => day.date.getDate() === 4 && day.currentMonth);
    expect(day3?.dayIndex).toBe(3);
    expect(day4?.dayIndex).toBeNull();
    const selected = jasmine.createSpy('selected');
    picker.selectedDayChange.subscribe(selected);
    picker.select(day4?.dayIndex ?? null);
    expect(selected).not.toHaveBeenCalled();
    expect(picker.expanded).toBeTrue();
    picker.select(6);
    expect(selected).toHaveBeenCalledOnceWith(6);
    expect(picker.expanded).toBeFalse();
  });

  it('navigates between available months without leaving the allowed range', () => {
    picker.toggle();
    expect(picker.canPrevious).toBeFalse();
    expect(picker.canNext).toBeTrue();
    picker.navigate(-1);
    expect(picker.visibleMonth?.getMonth()).toBe(0);
    picker.navigate(1);
    expect(picker.visibleMonth?.getMonth()).toBe(1);
    expect(picker.canNext).toBeFalse();
    picker.navigate(1);
    expect(picker.visibleMonth?.getMonth()).toBe(1);
  });

  it('refuses selections when the parent is busy', () => {
    const selected = jasmine.createSpy('selected');
    picker.selectedDayChange.subscribe(selected);
    picker.disabled = true;
    picker.toggle();
    picker.select(3);
    expect(picker.expanded).toBeFalse();
    expect(selected).not.toHaveBeenCalled();
  });
});
