import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { Subject, of } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { ClientSetValues, ClientWorkoutSet, CoachClientOverview, CoachOverview } from '../../../models/coach-workspace.model';
import { CoachClientDetailComponent } from './coach-client-detail.component';
import type { EditableSet, ExerciseSets } from './client-plan';

const values = (repetitions: number): ClientSetValues => ({
  targetRepetitions: repetitions, targetWeightKg: 20, restSeconds: 60,
  actualRepetitions: null, actualWeightKg: null, notes: null, completed: false,
});
const editable = (id = 1): EditableSet => ({ id, setNumber: id, ...values(15), original: values(10) });
const entry = (sets: EditableSet[]): ExerciseSets => ({ loading: false, sets, exercise: {
  userWorkoutExerciseId: 1, workoutExerciseId: 1, exerciseId: 1, name: 'Squat', order: 0,
  completed: false, setsTotal: sets.length, setsCompleted: 0, feedback: null,
  templateSets: null, templateRepetitions: null, templateRestSeconds: null,
} });
const client = (id: number): CoachClientOverview => ({
  userId: id, username: `Client ${id}`, email: `${id}@example.com`, age: null, weight: null,
  height: null, gender: null, goals: null, lastCompletedAt: null, programs: [], workouts: [],
});
const overview = (id: number): CoachOverview => ({ from: '2026-10-23', to: '2026-10-23', clients: [client(id)] });

function create(workspace: object, route: object = {}): CoachClientDetailComponent {
  TestBed.configureTestingModule({ providers: [
    { provide: CoachWorkspaceService, useValue: workspace },
    { provide: ActivatedRoute, useValue: route },
    { provide: Router, useValue: { navigate: jasmine.createSpy() } },
  ] });
  return TestBed.runInInjectionContext(() => new CoachClientDetailComponent());
}

describe('Client set save snapshots', () => {
  let component: CoachClientDetailComponent;
  let requests: Subject<void>[];
  let save: jasmine.Spy;
  beforeEach(() => {
    requests = [];
    save = jasmine.createSpy().and.callFake(() => {
      const request = new Subject<void>(); requests.push(request); return request;
    });
    component = create({ saveClientSet: save, getClientWorkoutSets: () => new Subject<ClientWorkoutSet[]>() });
    component.userId = 1;
    component.setEditor.exerciseSets = [entry([editable()])];
  });
  const finish = (request: Subject<void>) => { request.next(); request.complete(); };

  it('keeps a newer repetition count dirty until a second save succeeds', () => {
    const row = component.setEditor.exerciseSets[0].sets[0];
    component.setEditor.saveSets();
    expect(save.calls.mostRecent().args).toEqual([1, values(15), values(10)]);
    row.targetRepetitions = 20;
    finish(requests[0]);
    expect(row.original.targetRepetitions).toBe(15);
    expect(row.targetRepetitions).toBe(20);
    expect(component.setEditor.dirty).toBeTrue();
    component.setEditor.saveSets();
    expect(save.calls.mostRecent().args[1].targetRepetitions).toBe(20);
    finish(requests[1]);
    expect(row.original.targetRepetitions).toBe(20);
    expect(component.setEditor.dirty).toBeFalse();
  });

  it('does not navigate away if further edits were made during save-and-continue', () => {
    const after = jasmine.createSpy();
    component.setEditor.saveSets(after);
    component.setEditor.exerciseSets[0].sets[0].notes = 'New unsaved note';
    finish(requests[0]);
    expect(after).not.toHaveBeenCalled();
    expect(component.setEditor.dirty).toBeTrue();
    component.setEditor.saveSets(after);
    finish(requests[1]);
    expect(after).toHaveBeenCalledOnceWith();
  });

  it('captures every row before a sequential multi-row save starts', () => {
    const second = editable(2);
    component.setEditor.exerciseSets[0].sets.push(second);
    component.setEditor.saveSets();
    second.targetRepetitions = 25;
    second.completed = true;
    finish(requests[0]);
    finish(requests[1]);
    expect(save.calls.argsFor(1)).toEqual([2, values(15), values(10)]);
    expect(second.original).toEqual(values(15));
    expect(component.setEditor.isChanged(second)).toBeTrue();
  });

  it('does not resend a committed row when a subsequent row fails', () => {
    component.setEditor.exerciseSets = [entry([editable(1), editable(2)])];
    component.setEditor.exerciseSets[0].sets[0].completed = true;
    component.setEditor.saveSets();
    finish(requests[0]);
    requests[1].error(new Error('conflict'));
    expect(component.setEditor.exerciseSets[0].sets[0].original).toEqual({ ...values(15), completed: true });
    expect(component.setEditor.exerciseSets[0].exercise.setsCompleted).toBe(1);
    expect(component.setEditor.exerciseSets[0].sets[1].original).toEqual(values(10));
    expect(component.setEditor.changedRows.map(row => row.id)).toEqual([2]);
    expect(component.messageType).toBe('error');
    component.setEditor.saveSets();
    expect(save.calls.allArgs().map(args => args[0])).toEqual([1, 2, 2]);
    expect(save.calls.mostRecent().args[2]).toEqual(values(10));
    finish(requests[2]);
    expect(component.setEditor.dirty).toBeFalse();
  });

  it('does not change the last confirmed values when saving fails', () => {
    const row = component.setEditor.exerciseSets[0].sets[0];
    component.setEditor.saveSets();
    row.targetRepetitions = 20;
    requests[0].error(new Error('offline'));
    expect(row.original).toEqual(values(10));
    expect(component.setEditor.dirty).toBeTrue();
    expect(component.setEditor.saving).toBeFalse();
    expect(component.messageType).toBe('error');
  });
});

describe('Client route context isolation', () => {
  let component: CoachClientDetailComponent;
  let routes: Subject<ParamMap>;
  let requests: Subject<CoachOverview>[];
  let assignment: Subject<string | null>;
  let getOverview: jasmine.Spy;
  let revoke: jasmine.Spy;
  beforeEach(() => {
    routes = new Subject<ParamMap>();
    requests = [];
    assignment = new Subject<string | null>();
    getOverview = jasmine.createSpy().and.callFake(() => {
      const request = new Subject<CoachOverview>(); requests.push(request); return request;
    });
    revoke = jasmine.createSpy().and.returnValue(of(undefined));
    component = create({ getOverview, assignProgram: () => assignment, revokeProgram: revoke,
      getClientProgramRows: () => of([]) },
      { paramMap: routes, snapshot: { queryParamMap: convertToParamMap({}) } });
    component.ngOnInit();
  });
  const go = (routes: Subject<ParamMap>, id: string) => routes.next(convertToParamMap({ userId: id }));

  it('keeps the latest client when an earlier response arrives afterwards', () => {
    go(routes, '1'); go(routes, '2');
    requests[1].next(overview(2)); requests[0].next(overview(1));
    expect(component.userId).toBe(2);
    expect(component.client?.userId).toBe(2);
  });

  it('clears old client data and action state before the next response arrives', () => {
    go(routes, '1'); requests[0].next(overview(1));
    component.programId = 99;
    component.setEditor.exerciseSets = [entry([editable()])];
    component.assignments.assignOpen = true;
    component.assignments.assignProgramId = 99;
    component.assignments.askRevoke(99);
    go(routes, '2');
    expect(component.client).toBeNull();
    expect(component.loading).toBeTrue();
    expect(component.setEditor.exerciseSets).toEqual([]);
    expect(component.programId).toBeNull();
    expect(component.assignments.assignOpen).toBeFalse();
    expect(component.assignments.assignProgramId).toBeNull();
    component.assignments.confirmRevoke(component.userId);
    expect(revoke).not.toHaveBeenCalled();
  });

  it('ignores a stale client error without interrupting the active load', () => {
    go(routes, '1'); go(routes, '2');
    requests[0].error(new Error('old failure'));
    expect(component.loading).toBeTrue();
    expect(component.message).toBe('');
    requests[1].next(overview(2));
    expect(component.loading).toBeFalse();
  });

  it('isolates responses when switching A to B and back to A', () => {
    go(routes, '1'); go(routes, '2'); go(routes, '1');
    requests[2].next(overview(1));
    component.message = 'Latest context';
    requests[0].error(new Error('old A failure'));
    requests[1].next(overview(2));
    expect(component.client?.userId).toBe(1);
    expect(component.message).toBe('Latest context');
  });

  it('ignores an old assignment completion instead of reloading the new client', () => {
    go(routes, '1'); requests[0].next(overview(1));
    component.assignments.assignProgramId = 99;
    component.assignments.confirmAssign(component.userId);
    go(routes, '2'); requests[1].next(overview(2));
    assignment.next('Assigned to old client'); assignment.complete();
    expect(component.client?.userId).toBe(2);
    expect(component.assignments.assigning).toBeFalse();
    expect(component.message).toBe('');
    expect(getOverview).toHaveBeenCalledTimes(2);
  });

  it('allows retrying after a current-client load error', () => {
    go(routes, '1'); requests[0].error(new Error('offline'));
    expect(component.loading).toBeFalse();
    go(routes, '1'); requests[1].next(overview(1));
    expect(component.client?.userId).toBe(1);
    expect(component.loading).toBeFalse();
  });
});
