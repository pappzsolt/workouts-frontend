import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';
import type { CoachClientOverview, CoachClientWorkout, CoachOverview } from '../../../models/coach-workspace.model';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import { CoachCalendarComponent } from './coach-calendar.component';

function workout(id: number, date = '2026-11-13'): CoachClientWorkout {
  return { userWorkoutId: id, programId: 29, workoutId: id, dayIndex: 1, workoutName: `Workout ${id}`,
    programName: 'Program', scheduledAt: date, completed: false, startedAt: null, performedAt: null };
}
function client(id: number, workouts: CoachClientWorkout[]): CoachClientOverview {
  return { userId: id, username: `Client ${id}`, email: `${id}@example.com`, age: null, weight: null,
    height: null, gender: null, goals: null, lastCompletedAt: null, programs: [], workouts };
}

describe('Coach calendar', () => {
  let api: jasmine.SpyObj<CoachWorkspaceService>;
  let fixture: ComponentFixture<CoachCalendarComponent>;
  const clients = [client(7, [workout(101), workout(102)]), client(8, [workout(201)]),
    client(9, [workout(301)]), client(10, [workout(401)]), client(11, [])];
  beforeEach(() => {
    api = jasmine.createSpyObj('workspace', ['getOverview']);
    api.getOverview.and.returnValue(of({ from: '', to: '', clients }));
    TestBed.configureTestingModule({ imports: [CoachCalendarComponent], providers: [
      provideRouter([]), provideTranslateService(), { provide: CoachWorkspaceService, useValue: api },
    ] });
    fixture = TestBed.createComponent(CoachCalendarComponent);
    fixture.componentInstance.month = new Date(2026, 10, 1);
    fixture.componentInstance.selectedDate = '2026-11-13';
  });

  it('shows all clients on the same day, groups their names and opens every exact workout', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(api.getOverview).toHaveBeenCalledOnceWith('2026-10-26', '2026-12-06');
    expect(component.selectedEntries.length).toBe(4);
    expect(component.selectedEntries[0].workouts.length).toBe(2);
    expect(component.color(7)).not.toBe(component.color(8));
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('article').length).toBe(4);
    expect(element.querySelector('a[href="/coach/clients/7?workout=101&program=29&date=2026-11-13"]')).not.toBeNull();
    expect(element.querySelector('a[href="/coach/clients/7?workout=102&program=29&date=2026-11-13"]')).not.toBeNull();
    expect(element.querySelector('a[href="/coach/clients/8?workout=201&program=29&date=2026-11-13"]')).not.toBeNull();
    const day = element.querySelector('button[aria-pressed="true"]')!;
    expect(day.textContent).toContain('coachWorkspace.calendar.more');
  });

  it('filters by the selected client and restores all clients without reloading', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const select = element.querySelector('select')!;
    select.value = [...select.options].find(option => option.textContent?.includes('Client 8'))!.value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.componentInstance.selectedEntries.map(entry => entry.client.userId)).toEqual([8]);
    expect(element.querySelectorAll('article').length).toBe(1);
    fixture.componentInstance.selectedUserId = 11;
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedEntries).toEqual([]);
    expect(element.textContent).toContain('coachWorkspace.calendar.empty');
    fixture.componentInstance.selectedUserId = null;
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedEntries.length).toBe(4);
    expect(api.getOverview).toHaveBeenCalledTimes(1);
  });

  it('cancels stale month requests and keeps the filter when crossing a year boundary', () => {
    const old = new Subject<CoachOverview>();
    const next = new Subject<CoachOverview>();
    api.getOverview.and.returnValues(old, next);
    fixture.componentInstance.month = new Date(2026, 11, 1);
    fixture.componentInstance.selectedUserId = 8;
    fixture.detectChanges();
    fixture.componentInstance.changeMonth(1);
    fixture.detectChanges();
    expect(old.observed).toBeFalse();
    old.next({ from: '', to: '', clients });
    expect(fixture.componentInstance.selectedEntries).toEqual([]);
    next.next({ from: '', to: '', clients: [client(8, [workout(201, '2027-01-01')])] });
    fixture.detectChanges();
    expect(fixture.componentInstance.month).toEqual(new Date(2027, 0, 1));
    expect(fixture.componentInstance.selectedUserId).toBe(8);
    expect(fixture.componentInstance.selectedEntries[0].workouts[0].userWorkoutId).toBe(201);
    fixture.destroy();
    expect(next.observed).toBeFalse();
  });

  it('clears old calendar entries on failure and supports retry', () => {
    api.getOverview.and.returnValues(of({ from: '', to: '', clients }), throwError(() => new Error('Failed')),
      of({ from: '', to: '', clients: [] }));
    fixture.detectChanges();
    fixture.componentInstance.load(); fixture.detectChanges();
    expect(fixture.componentInstance.selectedEntries).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).not.toBeNull();
    fixture.componentInstance.load(); fixture.detectChanges();
    expect(fixture.componentInstance.failed).toBeFalse();
    expect(fixture.componentInstance.clients).toEqual([]);
  });
});
