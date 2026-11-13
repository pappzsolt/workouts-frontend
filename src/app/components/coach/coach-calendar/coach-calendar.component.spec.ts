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
    expect(component.clientHue(7)).not.toBe(component.clientHue(8));
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
  it('shows a moved workout on its actual day in the program-scoped shared calendar', () => {
    const andi = client(7, [workout(101, '2026-11-20'), { ...workout(102, '2026-11-13'), programId: 99 }]);
    const other = client(8, [workout(201, '2026-11-13')]);
    api.getOverview.and.returnValue(of({ from: '', to: '', clients: [andi, other, client(9, [{ ...workout(301), programId: 99 }])] }));
    fixture.componentRef.setInput('programId', 29);
    fixture.componentRef.setInput('assignedUserIds', new Set([7, 8]));
    fixture.componentRef.setInput('initialDate', '2026-11-13');
    fixture.componentRef.setInput('embedded', true);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.entriesFor('2026-11-13').map(entry => entry.client.userId)).toEqual([8]);
    expect(component.entriesFor('2026-11-20').map(entry => entry.client.userId)).toEqual([7]);
    expect(component.clients.map(entry => entry.userId)).toEqual([7, 8]);
    component.selectedDate = '2026-11-20'; fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/coach/clients/7?workout=101&program=29&date=2026-11-20"]')).not.toBeNull();
  });

  it('does not show historical workouts after a program assignment has been revoked', () => {
    const active = client(7, [workout(101)]);
    const revoked = client(8, [workout(201)]);
    // The overview API intentionally retains old user_workouts after revocation.
    api.getOverview.and.returnValue(of({ from: '', to: '', clients: [active, revoked] }));
    fixture.componentRef.setInput('programId', 29);
    fixture.componentRef.setInput('assignedUserIds', new Set([7]));
    fixture.detectChanges();
    expect(fixture.componentInstance.clients.map(item => item.userId)).toEqual([7]);
    expect(fixture.componentInstance.selectedEntries.map(entry => entry.client.userId)).toEqual([7]);
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-calendar-client="8"]')).toBeNull();
  });

  it('removes a revoked user from the open calendar when active assignments change', () => {
    // Even a delayed/stale overview response must not reintroduce a revoked user.
    api.getOverview.and.returnValue(of({ from: '', to: '', clients: [
      client(7, [workout(101)]), client(8, [workout(201)]),
    ] }));
    fixture.componentRef.setInput('programId', 29);
    fixture.componentRef.setInput('assignedUserIds', new Set([7, 8]));
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedEntries.map(entry => entry.client.userId)).toEqual([7, 8]);
    fixture.componentInstance.selectedUserId = 8;
    fixture.componentRef.setInput('assignedUserIds', new Set([7]));
    fixture.detectChanges();
    expect(fixture.componentInstance.clients.map(item => item.userId)).toEqual([7]);
    expect(fixture.componentInstance.selectedUserId).toBeNull();
    expect(fixture.componentInstance.selectedEntries.map(entry => entry.client.userId)).toEqual([7]);
    expect(api.getOverview).toHaveBeenCalledTimes(2);
  });

  it('uses only active program relationships when assignment ids are not supplied', () => {
    const active = { ...client(7, [workout(101)]), programs: [{
      programId: 29, name: 'Program', startDate: null, endDate: null,
      totalWorkouts: 1, completedWorkouts: 0,
    }] };
    const revoked = client(8, [workout(201)]);
    api.getOverview.and.returnValue(of({ from: '', to: '', clients: [active, revoked] }));
    fixture.componentRef.setInput('programId', 29);
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedEntries.map(entry => entry.client.userId)).toEqual([7]);
  });

  it('splits a shared workout day into separate named client bands with stable colors', () => {
    api.getOverview.and.returnValue(of({ from: '', to: '', clients: [
      client(7, [workout(101)]), client(8, [workout(101)]),
    ] }));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const day = element.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')!;
    const bands = [...day.querySelectorAll<HTMLElement>('[data-calendar-client]')];
    expect(bands.length).toBe(2);
    expect(bands[0].textContent).toContain('Client 7');
    expect(bands[1].textContent).toContain('Client 8');
    expect(bands.every(band => band.textContent?.includes('Workout 101'))).toBeTrue();
    expect(getComputedStyle(bands[0]).backgroundColor).not.toBe(getComputedStyle(bands[1]).backgroundColor);
    const originalHue = fixture.componentInstance.clientHue(7);
    expect(new Set(Array.from({ length: 20 }, (_, index) => fixture.componentInstance.clientHue(index + 1))).size).toBe(20);
    for (const width of [280, 375, 768]) {
      element.querySelector('section')!.style.width = `${width}px`;
      expect(Math.round(day.getBoundingClientRect().height)).toBe(144);
      const heights = bands.map(band => band.getBoundingClientRect().height);
      expect(Math.abs(heights[0] - heights[1])).toBeLessThanOrEqual(1);
      expect(day.scrollWidth).toBeLessThanOrEqual(day.clientWidth);
    }
    fixture.componentInstance.clients.reverse();
    expect(fixture.componentInstance.clientHue(7)).toBe(originalHue);
  });

  it('follows different client dates while keeping one shared workout exercise list', () => {
    const shared = { ...workout(101), workoutId: 50, scheduledAt: '2026-11-13' };
    api.getOverview.and.returnValue(of({ from: '', to: '', clients: [
      client(7, [{ ...shared, userWorkoutId: 201, scheduledAt: '2026-11-14' }]), client(8, [shared]),
    ] }));
    fixture.componentRef.setInput('programId', 29);
    fixture.componentRef.setInput('assignedUserIds', new Set([7, 8]));
    fixture.componentRef.setInput('showProgramStructure', true);
    fixture.componentRef.setInput('programWorkouts', [{
      programWorkoutId: 11, workoutId: 50, name: 'Shared workout', description: null,
      exercises: [{ id: 1, name: 'Shared squat', description: null, sets: 3, repetitions: 10, restSeconds: 60, notes: null }],
    }]);
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedEntries.map(entry => entry.client.userId)).toEqual([8]);
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-shared-workout]')!.textContent).toContain('Shared squat');
    fixture.componentInstance.selectDate(new Date(2026, 10, 14)); fixture.detectChanges();
    expect(fixture.componentInstance.selectedEntries.map(entry => entry.client.userId)).toEqual([7]);
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-shared-workout]')!.textContent).toContain('Shared squat');
  });

});
