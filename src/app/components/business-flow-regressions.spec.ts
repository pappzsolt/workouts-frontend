import { DestroyRef, EnvironmentInjector, createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { LoggerService } from '../services/logger.service';
import { UserExercisesComponent } from './user-dashboard/operations/user-exercises/user-exercises.component';
import { UserExerciseDetailComponent } from './user-dashboard/operations/user-exercises/user-exercises-detail/user-exercises-detail.component';
import { UserEditComponent } from './admin-dashboard/operations/user-edit/user-edit.component';

const ok = (data: any = null) => ({ success: true, data, message: null });
const params = (values: Record<string, string>) => convertToParamMap(values);

// These tests exercise component workflows without rendering unrelated boards.
describe('Business flow regressions', () => {
  let injector: EnvironmentInjector;
  const destroyCallbacks: Array<() => void> = [];
  beforeEach(() => {
    destroyCallbacks.length = 0;
    injector = createEnvironmentInjector([
      { provide: LoggerService, useValue: { error() {}, warn() {} } },
      { provide: DestroyRef, useValue: { onDestroy(callback: () => void) {
        destroyCallbacks.push(callback);
        return () => { const index = destroyCallbacks.indexOf(callback); if (index >= 0) destroyCallbacks.splice(index, 1); };
      } } },
    ], {} as EnvironmentInjector);
  });
  afterEach(() => {
    [...destroyCallbacks].forEach(callback => callback());
    injector.destroy();
  });
  const make = <T>(factory: () => T): T => runInInjectionContext(injector, factory);

  function exerciseRoute(detail = false) {
    return {
      paramMap: new BehaviorSubject(params({ workoutId: '5', ...(detail ? { exerciseId: '6' } : {}) })),
      queryParamMap: new BehaviorSubject(params({ programId: '7', userWorkoutId: '100', programWorkoutId: '10' })),
    };
  }

  it('loads the new occurrence when only userWorkoutId changes, ignoring the delayed old response', () => {
    const route = exerciseRoute();
    const old = new Subject<any>();
    const current = new Subject<any>();
    const load = jasmine.createSpy('getWorkoutExercises').and.callFake((id: number) => id === 100 ? old : current);
    const component = make(() => new UserExercisesComponent(route as any, {} as any,
      { getWorkoutExercises: load } as any, { language$: new BehaviorSubject('hu') } as any));
    component.ngOnInit();
    route.queryParamMap.next(params({ programId: '7', userWorkoutId: '200', programWorkoutId: '20' }));
    current.next(ok({ name: 'Current', exercises: [{ id: 200 }] }));
    old.next(ok({ name: 'Old', exercises: [{ id: 100 }] }));
    expect(load.calls.allArgs()).toEqual([[100, 'hu'], [200, 'hu']]);
    expect(component.userWorkoutId).toBe(200);
    expect(component.programWorkoutId).toBe(20);
    expect(component.paginatedExercises.map(exercise => exercise.id)).toEqual([200]);
    component.ngOnDestroy();
  });

  it('continues handling route changes after an exercise load failed', () => {
    const route = exerciseRoute();
    const load = jasmine.createSpy('getWorkoutExercises').and.callFake((id: number) => id === 100
      ? throwError(() => new Error('failed')) : of(ok({ exercises: [] })));
    const component = make(() => new UserExercisesComponent(route as any, {} as any,
      { getWorkoutExercises: load } as any, { language$: new BehaviorSubject('hu') } as any));
    component.ngOnInit();
    expect(component.loadFailed).toBeTrue();
    route.queryParamMap.next(params({ programId: '7', userWorkoutId: '200' }));
    expect(component.loadFailed).toBeFalse();
    expect(component.userWorkoutId).toBe(200);
    component.ngOnDestroy();
  });

  it('updates detail save identifiers when an occurrence changes on the same route', () => {
    const route = exerciseRoute(true);
    const save = jasmine.createSpy('save').and.returnValue(of(ok()));
    const api = { getWorkoutExercises: () => of(ok({ exercises: [{ exercise: { id: 6 }, userWorkoutExerciseSets: [] }] })), updateSetCompleted: save };
    const component = make(() => new UserExerciseDetailComponent(route as any, api as any,
      { language$: new BehaviorSubject('hu') } as any));
    component.ngOnInit();
    route.queryParamMap.next(params({ programId: '8', userWorkoutId: '200', programWorkoutId: '20' }));
    component.updateSetCompleted({ id: 201, completed: false } as any, true);
    expect(save.calls.mostRecent().args.slice(0, 2)).toEqual([200, 8]);
    component.ngOnDestroy();
  });

  function setEditor() {
    const requests: Subject<any>[] = [];
    const save = jasmine.createSpy('save').and.callFake(() => {
      const request = new Subject<any>();
      requests.push(request);
      return request;
    });
    const component = make(() => new UserExerciseDetailComponent({} as any,
      { updateSetCompleted: save } as any, {} as any));
    component.userWorkoutId = 100; component.programId = 7; component.workoutId = 5;
    const set = { id: 99, setNumber: 1, completed: false, actualRepetitions: 10, actualWeightKg: 20, notes: '' } as any;
    component.workoutExercise = { exercise: { id: 6 }, userWorkoutExerciseSets: [set] } as any;
    return { component, set, save, requests };
  }

  it('serializes blur and Done writes and preserves the completed state', () => {
    const { component, set, save, requests } = setEditor();
    component.saveSetDetails(set, false);
    component.updateSetCompleted(set, true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.calls.first().args[5]).toBeFalse();
    requests[0].next(ok()); requests[0].complete();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.calls.mostRecent().args[5]).toBeTrue();
    requests[1].next(ok()); requests[1].complete();
    expect(set.completed).toBeTrue();
    component.ngOnDestroy();
  });

  it('shares duplicate blur/page saves but queues changed field values', () => {
    const { component, set, save, requests } = setEditor();
    component.saveSetDetails(set, false);
    component.saveSetDetails(set, false);
    set.actualWeightKg = 30;
    component.saveSetDetails(set, false);
    expect(save).toHaveBeenCalledTimes(1);
    requests[0].next(ok()); requests[0].complete();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.calls.mostRecent().args[7]).toBe(30);
    requests[1].next(ok()); requests[1].complete();
    component.ngOnDestroy();
  });

  it('allows a queued Done write after blur failed and rolls back a rejected toggle', () => {
    const { component, set, save, requests } = setEditor();
    component.saveSetDetails(set, false);
    component.updateSetCompleted(set, true);
    requests[0].error(new Error('blur failed'));
    expect(save).toHaveBeenCalledTimes(2);
    requests[1].next(ok()); requests[1].complete();
    expect(set.completed).toBeTrue();
    component.updateSetCompleted(set, false);
    requests[2].next({ success: false, data: null, message: 'rejected' }); requests[2].complete();
    expect(set.completed).toBeTrue();
    expect(component.message).toBe('rejected');
    component.ngOnDestroy();
  });

  it('does not apply an older detail save message or pagination to a different exercise', () => {
    const { component, set, requests } = setEditor();
    component.saveSetDetails(set);
    component.workoutExercise = { exercise: { id: 20 }, userWorkoutExerciseSets: [] } as any;
    component.message = 'New exercise';
    requests[0].next({ ...ok(), message: 'Old save' }); requests[0].complete();
    expect(component.message).toBe('New exercise');
    component.ngOnDestroy();
  });

  it('keeps the new exercise page index when an older set pagination save completes', () => {
    const { component, set, requests } = setEditor();
    component.workoutExercise!.userWorkoutExerciseSets.push({ ...set, id: 101 });
    component.goToSet(1);
    component.workoutExercise = { exercise: { id: 20 }, userWorkoutExerciseSets: [] } as any;
    component.currentSetIndex = 0;
    requests[0].next(ok()); requests[0].complete();
    expect(component.currentSetIndex).toBe(0);
    component.ngOnDestroy();
  });

  function adminEditor() {
    const users = new Subject<any[]>();
    const roles = new Subject<any[]>();
    const coaches = new Subject<any[]>();
    const update = jasmine.createSpy('updateUser').and.returnValue(of(ok()));
    const component = make(() => new UserEditComponent({ getUsers: () => users, getCoaches: () => coaches,
      updateUser: update } as any, { getRoles: () => roles } as any, { detectChanges() {} } as any));
    component.ngOnInit();
    return { component, users, roles, coaches, update };
  }

  it('waits for roles and coaches and retains the existing roles in the admin payload', () => {
    const { component, users, roles, coaches, update } = adminEditor();
    users.next([{ id: 1, usernameOrName: 'User', roles: ['ROLE_USER', 'ROLE_ADMIN'], extraFields: { coach_id: 10 } }]); users.complete();
    component.onSave(); expect(update).not.toHaveBeenCalled();
    roles.next([{ id: 1, name: 'ROLE_USER' }, { id: 2, name: 'ROLE_ADMIN' }]); roles.complete();
    coaches.next([{ id: 10, name: 'Coach' }]); coaches.complete();
    expect(component.selectedCoach?.id).toBe(10);
    component.onSave();
    expect(update.calls.mostRecent().args[1]).toEqual([1, 2]);
  });

  it('passes the new admin password and does not report a rejected save as success', () => {
    const { component, users, roles, coaches, update } = adminEditor();
    roles.next([{ id: 1, name: 'ROLE_USER' }]); roles.complete();
    coaches.next([]); coaches.complete();
    users.next([{ id: 1, usernameOrName: 'User', roles: ['ROLE_USER'] }]); users.complete();
    component.selectedUser.password = 'new-test-password';
    update.and.returnValue(of({ success: false, data: null, message: 'Rejected' }));
    component.onSave();
    expect(update.calls.mostRecent().args[0].password).toBe('new-test-password');
    expect(component.selectedUser.password).toBe('new-test-password');
    expect(component.messageType).toBe('error');
    update.and.returnValue(of(ok())); component.onSave();
    expect(component.selectedUser.password).toBe('');
    expect(component.users[0].password).toBeUndefined();
  });

  it('blocks admin saves when initialization failed', () => {
    const { component, users, update } = adminEditor();
    users.error(new Error('load failed'));
    component.onSave();
    expect(component.ready).toBeFalse();
    expect(update).not.toHaveBeenCalled();
  });

  it('does not save roles when the role catalog is empty', () => {
    const { component, users, roles, coaches, update } = adminEditor();
    users.next([{ id: 1, usernameOrName: 'User', roles: ['ROLE_USER'] }]); users.complete();
    roles.next([]); roles.complete();
    coaches.next([]); coaches.complete();
    component.onSave();
    expect(component.ready).toBeFalse();
    expect(update).not.toHaveBeenCalled();
  });

});
