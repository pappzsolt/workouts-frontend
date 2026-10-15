import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import { CoachWorkoutBoardComponent } from './coach-workout-board.component';
import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { LoggerService } from '../../../../services/logger.service';
import type { Workout } from '../../../../models/workout.model';

describe('CoachWorkoutBoard single data source', () => {
  let search: jasmine.Spy;
  const language$ = new BehaviorSubject('hu');
  beforeEach(() => {
    search = jasmine.createSpy('searchMyWorkouts').and.callFake(() => new Subject());
    TestBed.configureTestingModule({
      imports: [CoachWorkoutBoardComponent],
      providers: [
        { provide: CoachWorkoutsService, useValue: { searchMyWorkouts: search } },
        { provide: LanguageService, useValue: { language$, getCurrentLanguage: () => 'hu' } },
        { provide: LoggerService, useValue: { error: () => {} } },
      ],
    }).overrideComponent(CoachWorkoutBoardComponent, { set: { template: '' } });
  });
  it('an explicitly supplied empty list never falls back to HTTP', () => {
    const fixture = TestBed.createComponent(CoachWorkoutBoardComponent);
    fixture.componentRef.setInput('externalWorkouts', []);
    fixture.detectChanges();
    expect(search).not.toHaveBeenCalled();
    expect(fixture.componentInstance.workouts).toEqual([]);
    fixture.destroy();
  });
  it('clears external results when the parent supplies an empty list', () => {
    const fixture = TestBed.createComponent(CoachWorkoutBoardComponent);
    fixture.componentRef.setInput('externalWorkouts', [{ id: 1, name: 'Workout' } as Workout]);
    fixture.detectChanges();
    fixture.componentRef.setInput('externalWorkouts', []);
    fixture.detectChanges();
    expect(fixture.componentInstance.workouts).toEqual([]);
    expect(search).not.toHaveBeenCalled();
    fixture.destroy();
  });
  it('uses remote search when there is no external list and cancels stale results', () => {
    const first = new Subject<any>(); const second = new Subject<any>();
    search.and.returnValues(first, second);
    const fixture = TestBed.createComponent(CoachWorkoutBoardComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.searchTerm = 'second'; component.onSearchChange();
    second.next({ content: [{ id: 2, name: 'Second' }], totalPages: 1 });
    first.next({ content: [{ id: 1, name: 'Stale' }], totalPages: 1 });
    expect(component.workouts.map((row) => row.id)).toEqual([2]);
    fixture.destroy();
  });
  it('does not mutate the parent selection array', () => {
    const fixture = TestBed.createComponent(CoachWorkoutBoardComponent);
    const selection = [1];
    fixture.componentRef.setInput('selectedWorkoutIds', selection);
    fixture.detectChanges();
    fixture.componentInstance.toggleWorkoutSelection(2, true);
    expect(selection).toEqual([1]);
    expect(fixture.componentInstance.selectedWorkoutIds).toEqual([1, 2]);
    fixture.destroy();
  });
});
