import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';
import type { ClientProgramRow, CoachClientOverview } from '../../../../models/coach-workspace.model';
import { CoachWorkspaceService } from '../../../../services/coach/coach-workspace.service';
import { ProgramClientCalendarComponent } from './program-client-calendar.component';

function row(userWorkoutId: number, name: string, date = '2026-11-13'): ClientProgramRow {
  return {
    user_workout_id: userWorkoutId, workout_name: name, scheduled_date: date,
    program_day_index: 1, program_workout_id: 11, workout_id: 20,
    workout_exercise_id: userWorkoutId, exercise_id: 30, exercise_name: 'Squat', exercise_order: 0,
    workout_completed: false, user_workout_exercise_id: userWorkoutId,
    exercise_completed: false, sets_done: 3,
  };
}
const client = (userId: number): CoachClientOverview => ({
  userId, username: `Client ${userId}`, email: `${userId}@example.com`, age: null,
  weight: null, height: null, gender: null, goals: null, lastCompletedAt: null, programs: [], workouts: [],
});

describe('Client program calendar', () => {
  let api: jasmine.SpyObj<CoachWorkspaceService>;
  beforeEach(() => {
    api = jasmine.createSpyObj('workspace', ['getClientProgramRows']);
    TestBed.configureTestingModule({
      imports: [ProgramClientCalendarComponent],
      providers: [provideRouter([]), provideTranslateService(), { provide: CoachWorkspaceService, useValue: api }],
    });
  });
  function render() {
    const fixture = TestBed.createComponent(ProgramClientCalendarComponent);
    fixture.componentRef.setInput('client', client(7));
    fixture.componentRef.setInput('programId', 10);
    fixture.componentRef.setInput('startDate', '2026-11-13');
    fixture.componentRef.setInput('durationDays', 20);
    fixture.detectChanges();
    return fixture;
  }

  it('keeps same-day workouts separate and links to exact client workout IDs', () => {
    api.getClientProgramRows.and.callFake(userId => of(userId === 7
      ? [row(101, 'Squat day'), row(102, 'Press day')]
      : [row(201, 'Other client workout')]));
    const fixture = render();
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;
    expect(api.getClientProgramRows).toHaveBeenCalledWith(7, 10);
    expect(component.selectedWorkouts.map(workout => workout.userWorkoutId)).toEqual([101, 102]);
    expect(component.cells[0].workoutCount).toBe(2);
    expect(element.querySelectorAll('article').length).toBe(2);
    expect(element.querySelector('a[href="/coach/clients/7?program=10&workout=101&date=2026-11-13"]')).not.toBeNull();
    expect(element.querySelector('a[href="/coach/clients/7?program=10&workout=102&date=2026-11-13"]')).not.toBeNull();
    fixture.componentRef.setInput('client', client(8));
    fixture.detectChanges();
    expect(component.selectedWorkouts.map(workout => workout.userWorkoutId)).toEqual([201]);
    expect(element.textContent).not.toContain('Squat day');
    expect(element.querySelector('a[href="/coach/clients/8?program=10&workout=201&date=2026-11-13"]')).not.toBeNull();
  });

  it('cancels a previous client load and clears old data while switching', () => {
    const first = new Subject<ClientProgramRow[]>();
    const second = new Subject<ClientProgramRow[]>();
    api.getClientProgramRows.and.returnValues(first, second);
    const fixture = render();
    fixture.componentRef.setInput('client', client(8));
    fixture.detectChanges();
    expect(first.observed).toBeFalse();
    first.next([row(101, 'Old client')]);
    expect(fixture.componentInstance.workouts).toEqual([]);
    second.next([row(201, 'New client')]);
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedWorkouts[0].name).toBe('New client');
    fixture.destroy();
    expect(second.observed).toBeFalse();
  });

  it('uses actual rescheduled dates and includes workouts outside the template range', () => {
    api.getClientProgramRows.and.returnValue(of([row(101, 'Moved workout', '2027-01-05')]));
    const fixture = render();
    const component = fixture.componentInstance;
    expect(component.selectedDate).toBe('2027-01-05');
    expect(component.selectedWorkouts[0].userWorkoutId).toBe(101);
    component.selectedDay = 1;
    expect(component.selectedWorkouts).toEqual([]);
  });

  it('shows a load failure without falling back to another client and allows retry', () => {
    api.getClientProgramRows.and.returnValues(throwError(() => new Error('Failed')), of([]));
    const fixture = render();
    expect(fixture.componentInstance.failed).toBeTrue();
    expect(fixture.componentInstance.cells).toEqual([]);
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.failed).toBeFalse();
    expect(fixture.componentInstance.selectedWorkouts).toEqual([]);
  });
});
