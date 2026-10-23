import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { CoachWorkoutsService, WorkoutLibraryPage } from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { LoggerService } from '../../../../services/logger.service';
import { WorkoutListComponent } from './coach-workouts.component';

const page: WorkoutLibraryPage = { items: [], totalElements: 0, totalPages: 1 };

describe('Workout library request recovery', () => {
  let component: WorkoutListComponent;
  let request: jasmine.Spy;
  let language: BehaviorSubject<string>;

  beforeEach(() => {
    request = jasmine.createSpy('getWorkoutLibraryPage');
    language = new BehaviorSubject('hu');
    TestBed.configureTestingModule({ providers: [
      { provide: LoggerService, useValue: { error() {} } },
    ] });
    component = TestBed.runInInjectionContext(() => new WorkoutListComponent(
      { getWorkoutLibraryPage: request } as unknown as CoachWorkoutsService,
      { language$: language } as unknown as LanguageService,
      {} as Router,
    ));
  });
  afterEach(() => component.ngOnDestroy());

  it('recovers after an initial failure when the coach changes sort order', () => {
    request.and.returnValues(throwError(() => new Error('offline')), of(page));
    component.ngOnInit();
    expect(component.message).toBe('coachWorkouts.loadError');
    expect(component.loading).toBeFalse();
    component.toggleSort();
    expect(request).toHaveBeenCalledTimes(2);
    expect(component.loading).toBeFalse();
    expect(component.message).toBe('');
    expect(component.messageType).toBe('');
  });

  it('allows searches, paging and language changes after repeated request failures', fakeAsync(() => {
    request.and.returnValues(
      throwError(() => new Error('offline')),
      throwError(() => new Error('still offline')),
      of({ ...page, totalPages: 2 }), of({ ...page, totalPages: 2 }),
    );
    component.ngOnInit();
    component.searchTerm = 'squat';
    component.onSearchChange();
    tick(300);
    expect(request).toHaveBeenCalledTimes(2);
    component.onPageChange(2);
    expect(request).toHaveBeenCalledTimes(3);
    language.next('en');
    expect(request).toHaveBeenCalledTimes(4);
    expect(component.loading).toBeFalse();
    tick(4000);
  }));

  it('ignores a cancelled earlier request error and keeps the latest result', () => {
    const earlier = new Subject<WorkoutLibraryPage>();
    const latest = new Subject<WorkoutLibraryPage>();
    request.and.returnValues(earlier, latest);
    component.ngOnInit();
    component.toggleSort();
    latest.next({ ...page, totalElements: 7, totalPages: 2 });
    earlier.error(new Error('late cancelled failure'));
    expect(component.totalItems).toBe(7);
    expect(component.totalPages).toBe(2);
    expect(component.message).toBe('');
    expect(component.loading).toBeFalse();
  });
});
