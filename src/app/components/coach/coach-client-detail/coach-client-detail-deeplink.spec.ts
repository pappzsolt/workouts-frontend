import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';

import type { ClientProgramRow, ClientWorkoutSet, CoachClientOverview, CoachOverview } from '../../../models/coach-workspace.model';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import { CoachClientDetailComponent } from './coach-client-detail.component';

const workoutRow = (occurrence: number, programWorkout: number): ClientProgramRow => ({
  scheduled_date: '2030-04-16', program_day_index: occurrence - 69,
  user_workout_id: occurrence, program_workout_id: programWorkout,
  workout_id: occurrence, workout_name: `Workout ${occurrence}`,
  workout_exercise_id: occurrence + 100, exercise_id: 1,
  exercise_name: 'Squat', exercise_order: 0, workout_completed: false,
  user_workout_exercise_id: occurrence + 200, exercise_completed: false, sets_done: 1,
});

const savedSet = (occurrence: number): ClientWorkoutSet => ({
  id: occurrence * 10, userWorkoutExerciseId: occurrence + 200, setNumber: 1,
  targetRepetitions: 8, targetWeightKg: 20, restSeconds: 60, targetRpe: null,
  actualRepetitions: null, actualWeightKg: null, completed: false,
  notes: null, startedAt: null, completedAt: null,
});

const athlete = (userId: number): CoachClientOverview => ({
  userId, username: `Athlete ${userId}`, email: `${userId}@example.test`,
  age: null, weight: null, height: null, gender: null, goals: null,
  lastCompletedAt: null, workouts: [], programs: [1, 2].map(programId => ({
    programId, name: `Program ${programId}`, startDate: null, endDate: null,
    totalWorkouts: 2, completedWorkouts: 0,
  })),
});

const overview = (userId: number): CoachOverview => ({
  from: '', to: '', clients: [athlete(userId)],
});

describe('Coach client same-route deep links', () => {
  let component: CoachClientDetailComponent;
  let query: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let api: jasmine.SpyObj<CoachWorkspaceService>;
  let router: { navigate: jasmine.Spy };

  beforeEach(() => {
    query = new BehaviorSubject(convertToParamMap({ program: '1', workout: '70' }));
    params = new BehaviorSubject(convertToParamMap({ userId: '7' }));
    api = jasmine.createSpyObj('workspace', ['getOverview', 'getClientProgramRows', 'getClientWorkoutSets', 'saveClientSet', 'revokeProgram']);
    api.getOverview.and.callFake((_from, _to, userId) => of(overview(userId!)));
    api.getClientProgramRows.and.callFake((_userId, programId) => of(programId === 1
      ? [workoutRow(70, 100), workoutRow(71, 101)]
      : [workoutRow(80, 200)]));
    api.getClientWorkoutSets.and.callFake(exerciseId => of([savedSet(exerciseId - 200)]));
    api.saveClientSet.and.returnValue(of(undefined));
    router = { navigate: jasmine.createSpy('navigate') };
    TestBed.configureTestingModule({ providers: [
      { provide: CoachWorkspaceService, useValue: api },
      { provide: ActivatedRoute, useValue: { paramMap: params, queryParamMap: query } },
      { provide: Router, useValue: router },
    ] });
    component = TestBed.runInInjectionContext(() => new CoachClientDetailComponent());
    component.ngOnInit();
  });

  it('selects another occurrence without refetching the client or program and saves its set', () => {
    expect(component.selected?.userWorkoutId).toBe(70);
    query.next(convertToParamMap({ program: '1', workout: '71' }));
    expect(component.selected?.userWorkoutId).toBe(71);
    expect(api.getOverview).toHaveBeenCalledTimes(1);
    expect(api.getClientProgramRows).toHaveBeenCalledTimes(1);
    component.setEditor.exerciseSets[0].sets[0].targetWeightKg = 44;
    component.setEditor.saveSets();
    expect(api.saveClientSet.calls.mostRecent().args[0]).toBe(710);
  });

  it('resolves program-workout IDs and changes programs using the current athlete', () => {
    query.next(convertToParamMap({ program: '1', programWorkout: '101' }));
    expect(component.selected?.userWorkoutId).toBe(71);
    query.next(convertToParamMap({ program: '2', programWorkout: '200' }));
    expect(component.programId).toBe(2);
    expect(component.selected?.userWorkoutId).toBe(80);
    expect(api.getOverview).toHaveBeenCalledTimes(1);
    expect(api.getClientProgramRows.calls.allArgs()).toEqual([[7, 1], [7, 2]]);
    query.next(convertToParamMap({ program: '2', programWorkout: '9999' }));
    expect(component.selected).toBeNull();
    expect(component.message).toBe('coachWorkspace.client.requestedWorkoutUnavailable');
  });

  it('leaves the editor closed for a missing occurrence even when another workout has the requested date', () => {
    query.next(convertToParamMap({ program: '2', workout: '999', date: '2030-04-16' }));
    expect(component.selected).toBeNull();
    expect(component.message).toBe('coachWorkspace.client.requestedWorkoutUnavailable');

    query.next(convertToParamMap({ program: '2', workout: '80' }));
    expect(component.selected?.userWorkoutId).toBe(80);
    expect(component.message).toBe('');

    query.next(convertToParamMap({ program: '2', workout: '999', date: '2030-04-16' }));
    expect(component.selected).toBeNull();
    expect(component.message).toBe('coachWorkspace.client.requestedWorkoutUnavailable');
  });

  it('preserves the open plan draft when revoking another program finishes', () => {
    const revoke = new Subject<void>();
    const reload = new Subject<CoachOverview>();
    api.revokeProgram.and.returnValue(revoke);
    api.getOverview.and.returnValue(reload);

    component.setTab('programs');
    component.assignments.askRevoke(1);
    component.assignments.confirmRevoke(7);
    component.setTab('plan');
    component.selectProgram(2);
    const row = component.setEditor.exerciseSets[0].sets[0];
    row.targetWeightKg = 55;

    revoke.next();
    revoke.complete();
    const athleteAfterRevocation = athlete(7);
    athleteAfterRevocation.programs = athleteAfterRevocation.programs.filter(program => program.programId !== 1);
    reload.next({ ...overview(7), clients: [athleteAfterRevocation] });
    reload.complete();

    expect(component.programId).toBe(2);
    expect(component.selected?.userWorkoutId).toBe(80);
    expect(component.setEditor.exerciseSets[0].sets[0]).toBe(row);
    expect(component.setEditor.changedRows[0].targetWeightKg).toBe(55);
    expect(api.getClientProgramRows.calls.allArgs()).toEqual([[7, 1], [7, 2]]);
  });

  it('guards dirty drafts, restores the accepted URL on cancel and allows explicit discard', () => {
    component.setEditor.exerciseSets[0].sets[0].targetWeightKg = 55;
    expect(component.setEditor.dirty).toBeTrue();
    query.next(convertToParamMap({ program: '1', workout: '71' }));
    expect(component.selected?.userWorkoutId).toBe(70);
    expect(component.pendingNav?.kind).toBe('deepLink');
    component.resolvePending('cancel');
    expect(router.navigate).toHaveBeenCalledWith(['/coach/clients', 7], {
      queryParams: { program: ['1'], workout: ['70'] },
    });
    expect(component.selected?.userWorkoutId).toBe(70);
    expect(component.setEditor.dirty).toBeTrue();
    query.next(convertToParamMap({ program: '1', workout: '71' }));
    component.resolvePending('discard');
    expect(component.selected?.userWorkoutId).toBe(71);
    expect(component.setEditor.dirty).toBeFalse();
  });

  it('keeps only the latest client context on an in-component path change', () => {
    params.next(convertToParamMap({ userId: '8' }));
    expect(component.userId).toBe(8);
    expect(component.client?.userId).toBe(8);
    expect(api.getOverview).toHaveBeenCalledTimes(2);
    expect(api.getClientProgramRows.calls.mostRecent().args).toEqual([8, 1]);
  });
});
