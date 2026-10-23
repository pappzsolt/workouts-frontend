import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { ClientProgramRow } from '../../../models/coach-workspace.model';
import { CoachClientDetailComponent } from './coach-client-detail.component';

const row = (id: number): ClientProgramRow => ({
  scheduled_date: '2026-10-23', program_day_index: 1, user_workout_id: id, program_workout_id: id,
  workout_id: id, workout_name: `Workout ${id}`, workout_exercise_id: id, exercise_id: id,
  exercise_name: 'Squat', exercise_order: 0, workout_completed: false,
  user_workout_exercise_id: id, exercise_completed: false, sets_done: 3,
});

describe('Client program loading regressions', () => {
  let component: CoachClientDetailComponent;
  let first: Subject<ClientProgramRow[]>;
  let second: Subject<ClientProgramRow[]>;
  let request: jasmine.Spy;
  beforeEach(() => {
    first = new Subject<ClientProgramRow[]>();
    second = new Subject<ClientProgramRow[]>();
    request = jasmine.createSpy().and.callFake((userId: number, programId: number) => programId === 1 ? first : second);
    TestBed.configureTestingModule({ providers: [
      { provide: CoachWorkspaceService, useValue: { getClientProgramRows: request, getClientWorkoutSets: () => of([]) } },
      { provide: ActivatedRoute, useValue: {} }, { provide: Router, useValue: {} },
    ] });
    component = TestBed.runInInjectionContext(() => new CoachClientDetailComponent());
    component.userId = 7;
    component.selectProgram(1);
    first.next([row(11)]);
  });

  it('clears previous workouts and sets immediately and keeps them cleared on failure', () => {
    expect(component.workouts.length).toBe(1);
    expect(component.exerciseSets.length).toBe(1);
    component.selectProgram(2);
    expect(component.workouts).toEqual([]);
    expect(component.weeks).toEqual([]);
    expect(component.selected).toBeNull();
    expect(component.exerciseSets).toEqual([]);
    second.error(new Error('offline'));
    expect(component.programLoadFailed).toBeTrue();
    expect(component.programLoading).toBeFalse();
    expect(component.workouts).toEqual([]);
  });

  it('retries the selected program after a failure and displays its data', () => {
    component.selectProgram(2);
    second.error(new Error('offline'));
    const retry = new Subject<ClientProgramRow[]>();
    request.and.returnValue(retry);
    component.retryProgram();
    expect(request).toHaveBeenCalledWith(7, 2);
    expect(component.programLoadFailed).toBeFalse();
    expect(component.programLoading).toBeTrue();
    expect(component.message).toBe('');
    retry.next([row(22)]);
    expect(component.selected?.userWorkoutId).toBe(22);
    expect(component.programLoading).toBeFalse();
  });

  it('ignores stale errors and responses after switching programs', () => {
    component.selectProgram(2);
    first.error(new Error('old failure'));
    expect(component.programLoading).toBeTrue();
    expect(component.message).toBe('');
    second.next([row(22)]);
    expect(component.selected?.userWorkoutId).toBe(22);
    expect(component.programLoadFailed).toBeFalse();
  });
});
