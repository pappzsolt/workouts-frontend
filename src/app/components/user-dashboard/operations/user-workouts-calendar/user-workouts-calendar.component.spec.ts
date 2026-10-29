import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject, of } from 'rxjs';
import type { ApiResponse } from '../../../../models/backend-dto/common/api-response';
import type { ScheduledWorkout } from '../../../../models/scheduled-workout/scheduled-workout.model';
import { LoggerService } from '../../../../services/logger.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { WorkoutExercisesManagerService } from '../../../../services/user/workout-exercises-manager.service';
import { UserWorkoutsCalendarComponent } from './user-workouts-calendar.component';

describe('Workout calendar month integration', () => {
  let component: UserWorkoutsCalendarComponent;
  let language: BehaviorSubject<string>;
  let first: Subject<ApiResponse<ScheduledWorkout[]>>;
  let second: Subject<ApiResponse<ScheduledWorkout[]>>;
  const workout: ScheduledWorkout = {
    userWorkoutId: 11, programWorkoutId: 21, workoutId: 31, programId: 41,
    scheduledAt: '2026-01-15', workoutName: 'Strength', completed: false,
  };

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 0, 15, 18, 30));
    language = new BehaviorSubject('hu');
    first = new Subject<ApiResponse<ScheduledWorkout[]>>();
    second = new Subject<ApiResponse<ScheduledWorkout[]>>();
    TestBed.configureTestingModule({ providers: [
      { provide: LoggerService, useValue: { error() {} } },
    ] });
    component = TestBed.runInInjectionContext(() => new UserWorkoutsCalendarComponent({
      getScheduledWorkouts: jasmine.createSpy().and.returnValues(first, second),
      getExercisesForUserWorkout: () => of([]),
    } as unknown as WorkoutExercisesManagerService, {
      language$: language,
    } as unknown as LanguageService));
    component.ngOnInit();
  });

  afterEach(() => {
    component.ngOnDestroy();
    jasmine.clock().uninstall();
  });

  it('builds the loaded month and keeps selected workouts and date lookup during month changes', () => {
    expect(component.calendarDays).toEqual([]);
    first.next({ success: true, message: null, data: [workout] });
    expect(component.currentYear).toBe(2026);
    expect(component.currentMonth).toBe(0);
    expect(component.calendarDays.filter(day => day.isToday).map(day => day.date.getDate())).toEqual([15]);
    expect(component.getWorkoutsForDay(new Date(2026, 0, 15))).toEqual([workout]);
    component.selectWorkout(workout);
    component.nextMonth();
    expect(component.currentMonth).toBe(1);
    expect(component.calendarDays.filter(day => day.currentMonth).length).toBe(28);
    expect(component.selectedWorkout).toBe(workout);
    component.previousMonth();
    expect(component.getWorkoutsForDay(new Date(2026, 0, 15))).toEqual([workout]);
    expect(component.calendarDays[0].date.getDay()).toBe(1);
  });

  it('preserves December/January year rollover in both directions', () => {
    component.currentYear = 2025;
    component.currentMonth = 11;
    component.nextMonth();
    expect(component.currentYear).toBe(2026);
    expect(component.currentMonth).toBe(0);
    expect(component.calendarDays.filter(day => day.currentMonth).length).toBe(31);
    component.previousMonth();
    expect(component.currentYear).toBe(2025);
    expect(component.currentMonth).toBe(11);
  });

  it('keeps the last loaded grid and workout index on a failed language reload', () => {
    first.next({ success: true, message: null, data: [workout] });
    const grid = component.calendarDays;
    language.next('en');
    second.error(new Error('offline'));
    expect(component.scheduledWorkoutsError).toBeTrue();
    expect(component.calendarDays).toBe(grid);
    expect(component.getWorkoutsForDay(new Date(2026, 0, 15))).toEqual([workout]);
  });

  it('ignores an old response after a newer language load has completed', () => {
    language.next('en');
    const translated = { ...workout, workoutName: 'Translated strength' };
    second.next({ success: true, message: null, data: [translated] });
    first.next({ success: true, message: null, data: [workout] });
    expect(component.getWorkoutsForDay(new Date(2026, 0, 15))).toEqual([translated]);
    expect(component.calendarDays.filter(day => day.isToday).length).toBe(1);
  });
});
